import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { getNumberingPrefixes } from "@/features/settings/get-numbering-prefixes";
import type { Prisma, SalesOrderItem } from "@/generated/prisma/client";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import {
    type ShipmentFormData,
    shipmentSchema,
} from "@/schemas/shipment-schema";
import {
    generateInventoryTransactionNumber,
    generateShipmentNumber,
    generateStockMovementNumber,
    retryOnUniqueConstraint,
    toNumber,
} from "./sales-helpers";

type ShipmentInputItem = ShipmentFormData["items"][number];

const ALLOWED_ORDER_STATUSES = new Set(["CONFIRMED", "PARTIALLY_FULFILLED"]);

const getNextOrderStatus = (allShipped: boolean, anyShipped: boolean) => {
    if (allShipped) {
        return "FULFILLED";
    }

    if (anyShipped) {
        return "PARTIALLY_FULFILLED";
    }

    return "CONFIRMED";
};

const validateShipmentLine = ({
    orderItem,
    shipItem,
}: {
    orderItem: SalesOrderItem;
    shipItem: ShipmentInputItem;
}): void => {
    const remainingOrderQty =
        toNumber(orderItem.quantity) - toNumber(orderItem.shippedQuantity);

    if (shipItem.quantity > remainingOrderQty) {
        throw new Error(
            `Shipment quantity exceeds remaining quantity for order line ${orderItem.id}.`
        );
    }
};

const processShipmentLine = async ({
    index,
    inventoryTransactionId,
    inventoryTransactionNumber,
    order,
    orderItem,
    shipmentId,
    shipItem,
    stockMovementPrefix,
    tx,
    userId,
    notes,
}: {
    index: number;
    inventoryTransactionId: string;
    inventoryTransactionNumber: string;
    notes: string | null;
    order: { orderNumber: string };
    orderItem: SalesOrderItem;
    shipmentId: string;
    shipItem: ShipmentInputItem;
    stockMovementPrefix: string;
    tx: Prisma.TransactionClient;
    userId: string;
}) => {
    const stockItem = await tx.stockItem.findUnique({
        where: { id: shipItem.stockItemId },
    });
    if (!stockItem) {
        throw new Error("Selected stock bucket was not found.");
    }
    if (stockItem.productId !== orderItem.productId) {
        throw new Error(
            `Selected stock bucket does not match product on order line ${orderItem.id}.`
        );
    }

    const reservedQty = toNumber(stockItem.reservedQuantity);
    const onHandQty = toNumber(stockItem.quantity);
    if (reservedQty < shipItem.quantity || onHandQty < shipItem.quantity) {
        throw new Error(
            `Insufficient reserved stock for order line ${orderItem.id}.`
        );
    }

    const [shipmentItem] = await Promise.all([
        tx.shipmentItem.create({
            data: {
                batchNumber: stockItem.batchNumber,
                productId: stockItem.productId,
                quantity: shipItem.quantity,
                serialNumber: stockItem.serialNumber,
                shipmentId,
            },
        }),
        tx.stockMovement.create({
            data: {
                batchNumber: stockItem.batchNumber,
                createdById: userId,
                fromWarehouseId: stockItem.warehouseId,
                inventoryTransactionId,
                movementNumber: generateStockMovementNumber(
                    stockMovementPrefix,
                    inventoryTransactionNumber,
                    index + 1
                ),
                productId: stockItem.productId,
                quantity: shipItem.quantity,
                reason: notes ?? `Shipment for ${order.orderNumber}`,
                referenceNumber: order.orderNumber,
                serialNumber: stockItem.serialNumber,
                type: "SALES_SHIPMENT",
            },
        }),
        tx.stockItem.update({
            data: {
                quantity: { decrement: shipItem.quantity },
                reservedQuantity: { decrement: shipItem.quantity },
            },
            where: { id: stockItem.id },
        }),
        tx.salesOrderItem.update({
            data: {
                shippedQuantity: { increment: shipItem.quantity },
            },
            where: { id: orderItem.id },
        }),
    ]);

    return shipmentItem;
};

export const shipOrder = createServerFn({ method: "POST" })
    .inputValidator(shipmentSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.SALES_ORDERS_CREATE_SHIPMENT
            )
        ) {
            throw new Error("You do not have permission to create shipments.");
        }

        const order = await prisma.salesOrder.findFirst({
            include: { items: true },
            where: { deletedAt: null, id: data.salesOrderId },
        });
        if (!order) {
            throw new Error("Sales order not found.");
        }
        const numberingPrefixes = await getNumberingPrefixes();
        if (!ALLOWED_ORDER_STATUSES.has(order.status)) {
            throw new Error(
                `Cannot ship an order in "${order.status}" status.`
            );
        }

        const orderItemsById = new Map(
            order.items.map((item) => [item.id, item])
        );

        const result = await retryOnUniqueConstraint(async () =>
            prisma.$transaction(async (tx) => {
                const shipmentNumber = generateShipmentNumber(
                    numberingPrefixes.shipment
                );
                const shipment = await tx.shipment.create({
                    data: {
                        carrier: data.carrier ?? null,
                        notes: data.notes ?? null,
                        salesOrderId: order.id,
                        shippedDate: data.shippedDate,
                        shipmentNumber,
                        status: "SHIPPED",
                        trackingNumber: data.trackingNumber ?? null,
                    },
                });

                const inventoryTransactionNumber =
                    generateInventoryTransactionNumber(
                        numberingPrefixes.inventoryTransaction
                    );
                const inventoryTransaction =
                    await tx.inventoryTransaction.create({
                        data: {
                            createdById: context.session.user.id,
                            notes:
                                data.notes ??
                                `Shipment ${shipmentNumber} for ${order.orderNumber}`,
                            referenceId: shipment.id,
                            referenceType: "Shipment",
                            transactionNumber: inventoryTransactionNumber,
                            type: "SALES_SHIPMENT",
                        },
                    });

                for (const [index, shipItem] of data.items.entries()) {
                    const orderItem = orderItemsById.get(
                        shipItem.salesOrderItemId
                    );
                    if (!orderItem) {
                        throw new Error(
                            "A shipment line does not belong to this sales order."
                        );
                    }

                    validateShipmentLine({ orderItem, shipItem });

                    await processShipmentLine({
                        index,
                        inventoryTransactionId: inventoryTransaction.id,
                        inventoryTransactionNumber,
                        notes: data.notes ?? null,
                        order,
                        orderItem,
                        shipmentId: shipment.id,
                        shipItem,
                        stockMovementPrefix: numberingPrefixes.stockMovement,
                        tx,
                        userId: context.session.user.id,
                    });
                }

                const refreshedOrderItems = await tx.salesOrderItem.findMany({
                    where: { salesOrderId: order.id },
                });

                const allShipped = refreshedOrderItems.every(
                    (item) =>
                        toNumber(item.shippedQuantity) >=
                        toNumber(item.quantity)
                );
                const anyShipped = refreshedOrderItems.some(
                    (item) => toNumber(item.shippedQuantity) > 0
                );
                const newStatus = getNextOrderStatus(allShipped, anyShipped);

                await tx.salesOrder.update({
                    data: {
                        shippedDate: allShipped ? data.shippedDate : null,
                        status: newStatus,
                    },
                    where: { id: order.id },
                });

                return {
                    inventoryTransaction,
                    newStatus,
                    shipment,
                };
            })
        );

        await logActivity({
            action: "SALES_ORDER_SHIPPED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    itemCount: data.items.length,
                    shipmentId: result.shipment.id,
                    shipmentNumber: result.shipment.shipmentNumber,
                    status: result.newStatus,
                },
            },
            entity: "SalesOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return result;
    });
