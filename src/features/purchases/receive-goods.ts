import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import {
    generateGoodsReceiptNumber,
    generateInventoryTransactionNumber,
    generateStockMovementNumber,
    retryOnUniqueConstraint,
} from "@/features/purchases/purchase-helpers";
import type { Prisma } from "@/generated/prisma/client";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { goodsReceiptSchema } from "@/schemas/goods-receipt-schema";

type PurchaseOrderWithItems = Prisma.PurchaseOrderGetPayload<{
    include: { items: { include: { product: true } } };
}>;

const assertReceivePermissions = (user: {
    isActive?: boolean | null;
    role?: string | null;
}): void => {
    const canReceivePurchaseOrder = canUser(
        user,
        PERMISSIONS.PURCHASE_ORDERS_RECEIVE_GOODS
    );
    const canCreateGoodsReceipt = canUser(
        user,
        PERMISSIONS.GOODS_RECEIPTS_CREATE
    );

    if (!(canReceivePurchaseOrder && canCreateGoodsReceipt)) {
        throw new Error("You do not have permission to receive goods.");
    }
};

const validateOrderForReceipt = (order: PurchaseOrderWithItems): void => {
    if (order.status !== "APPROVED" && order.status !== "PARTIALLY_RECEIVED") {
        throw new Error(
            `Only approved purchase orders can be received. Current status is "${order.status}".`
        );
    }
};

const validateReceiptItemAgainstOrder = ({
    item,
    order,
}: {
    item: {
        batchNumber?: string | null | undefined;
        expiryDate?: Date | null | undefined;
        productId: string;
        quantity: number;
        serialNumber?: string | null | undefined;
    };
    order: PurchaseOrderWithItems;
}): PurchaseOrderWithItems["items"][number] => {
    const orderItem = order.items.find(
        (entry) => entry.productId === item.productId
    );
    if (!orderItem) {
        throw new Error(
            `Product ${item.productId} does not exist on this purchase order.`
        );
    }

    const orderedQuantity = Number(orderItem.quantity);
    const receivedQuantity = Number(orderItem.receivedQuantity);
    const incomingQuantity = Number(item.quantity);
    const remainingQuantity = orderedQuantity - receivedQuantity;

    if (incomingQuantity <= 0) {
        throw new Error("Received quantity must be greater than zero.");
    }

    if (incomingQuantity > remainingQuantity) {
        throw new Error(
            `Cannot receive ${incomingQuantity} units for "${orderItem.product.name}". Remaining quantity is ${remainingQuantity}.`
        );
    }

    if (orderItem.product.trackByBatch && !item.batchNumber) {
        throw new Error(
            `Batch number is required for "${orderItem.product.name}".`
        );
    }
    if (orderItem.product.trackByExpiry && !item.expiryDate) {
        throw new Error(
            `Expiry date is required for "${orderItem.product.name}".`
        );
    }
    if (orderItem.product.trackBySerialNumber && !item.serialNumber) {
        throw new Error(
            `Serial number is required for "${orderItem.product.name}".`
        );
    }

    return orderItem;
};

const createOrUpdateStockBucket = async ({
    item,
    orderItem,
    tx,
}: {
    item: {
        batchNumber?: string | null | undefined;
        expiryDate?: Date | null | undefined;
        locationId?: string | null | undefined;
        productId: string;
        quantity: number;
        serialNumber?: string | null | undefined;
        warehouseId: string;
    };
    orderItem: PurchaseOrderWithItems["items"][number];
    tx: Prisma.TransactionClient;
}): Promise<void> => {
    const stockKey = {
        batchNumber: item.batchNumber ?? null,
        locationId: item.locationId ?? null,
        productId: item.productId,
        serialNumber: item.serialNumber ?? null,
        warehouseId: item.warehouseId,
    };

    const existingStockItem = await tx.stockItem.findFirst({
        where: stockKey,
    });

    if (existingStockItem) {
        await tx.stockItem.update({
            data: {
                expiryDate: item.expiryDate ?? undefined,
                quantity: { increment: item.quantity },
                unitCost: orderItem.unitPrice,
            },
            where: { id: existingStockItem.id },
        });
        return;
    }

    await tx.stockItem.create({
        data: {
            ...stockKey,
            expiryDate: item.expiryDate ?? null,
            quantity: item.quantity,
            reservedQuantity: 0,
            status: "AVAILABLE",
            unitCost: orderItem.unitPrice,
        },
    });
};

const isUniqueConstraintError = (error: unknown): boolean =>
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "P2002";

export const receiveGoods = createServerFn({ method: "POST" })
    .inputValidator(goodsReceiptSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        assertReceivePermissions(context.session.user);

        const purchaseOrder = await prisma.purchaseOrder.findUnique({
            include: { items: { include: { product: true } } },
            where: { id: data.purchaseOrderId },
        });
        if (!purchaseOrder) {
            throw new Error("Purchase order not found.");
        }
        validateOrderForReceipt(purchaseOrder);

        const warehouseIds = [
            ...new Set(data.items.map((item) => item.warehouseId)),
        ];
        const locationIds = [
            ...new Set(
                data.items
                    .map((item) => item.locationId)
                    .filter((locationId): locationId is string =>
                        Boolean(locationId)
                    )
            ),
        ];

        const [warehouses, locations] = await Promise.all([
            prisma.warehouse.findMany({
                select: { id: true },
                where: {
                    deletedAt: null,
                    id: { in: warehouseIds },
                    isActive: true,
                },
            }),
            prisma.location.findMany({
                select: { id: true, warehouseId: true },
                where: {
                    deletedAt: null,
                    id: { in: locationIds },
                    isActive: true,
                },
            }),
        ]);

        const activeWarehouseIds = new Set(
            warehouses.map((warehouse) => warehouse.id)
        );
        const locationMap = new Map(
            locations.map((location) => [location.id, location.warehouseId])
        );

        for (const item of data.items) {
            if (!activeWarehouseIds.has(item.warehouseId)) {
                throw new Error(
                    `Warehouse ${item.warehouseId} is invalid or inactive.`
                );
            }
            if (item.locationId) {
                const locationWarehouseId = locationMap.get(item.locationId);
                if (!locationWarehouseId) {
                    throw new Error(
                        `Location ${item.locationId} is invalid or inactive.`
                    );
                }
                if (locationWarehouseId !== item.warehouseId) {
                    throw new Error(
                        `Location ${item.locationId} does not belong to warehouse ${item.warehouseId}.`
                    );
                }
            }

            validateReceiptItemAgainstOrder({ item, order: purchaseOrder });
        }

        const receiptNumber = generateGoodsReceiptNumber(data.idempotencyKey);

        const result = await retryOnUniqueConstraint(async () =>
            prisma.$transaction(async (tx) => {
                const transactionNumber = generateInventoryTransactionNumber();

                const goodsReceipt = await tx.goodsReceipt.create({
                    data: {
                        notes: data.notes ?? null,
                        purchaseOrderId: data.purchaseOrderId,
                        receiptNumber,
                        receivedBy: context.session.user.id,
                        receivedDate: data.receivedDate,
                    },
                });

                const inventoryTransaction =
                    await tx.inventoryTransaction.create({
                        data: {
                            createdById: context.session.user.id,
                            notes: `Goods receipt ${receiptNumber}`,
                            referenceId: goodsReceipt.id,
                            referenceType: "GoodsReceipt",
                            transactionNumber,
                            type: "PURCHASE_RECEIPT",
                        },
                    });

                let itemLine = 1;
                for (const item of data.items) {
                    const orderItem = validateReceiptItemAgainstOrder({
                        item,
                        order: purchaseOrder,
                    });

                    await tx.goodsReceiptItem.create({
                        data: {
                            batchNumber: item.batchNumber ?? null,
                            expiryDate: item.expiryDate ?? null,
                            locationId: item.locationId ?? null,
                            productId: item.productId,
                            quantity: item.quantity,
                            receiptId: goodsReceipt.id,
                            warehouseId: item.warehouseId,
                        },
                    });

                    await tx.stockMovement.create({
                        data: {
                            batchNumber: item.batchNumber ?? null,
                            createdById: context.session.user.id,
                            inventoryTransactionId: inventoryTransaction.id,
                            movementNumber: generateStockMovementNumber(
                                transactionNumber,
                                itemLine
                            ),
                            productId: item.productId,
                            quantity: item.quantity,
                            reason: data.notes ?? "Purchase order receipt",
                            referenceNumber: purchaseOrder.orderNumber,
                            serialNumber: item.serialNumber ?? null,
                            toWarehouseId: item.warehouseId,
                            type: "PURCHASE_RECEIPT",
                        },
                    });

                    await createOrUpdateStockBucket({ item, orderItem, tx });

                    await tx.purchaseOrderItem.update({
                        data: {
                            receivedQuantity: {
                                increment: item.quantity,
                            },
                        },
                        where: { id: orderItem.id },
                    });
                    itemLine += 1;
                }

                const updatedOrderItems = await tx.purchaseOrderItem.findMany({
                    where: { purchaseOrderId: purchaseOrder.id },
                });
                const hasOutstandingItems = updatedOrderItems.some(
                    (item) =>
                        Number(item.receivedQuantity) < Number(item.quantity)
                );
                await tx.purchaseOrder.update({
                    data: {
                        receivedDate: hasOutstandingItems
                            ? null
                            : data.receivedDate,
                        status: hasOutstandingItems
                            ? "PARTIALLY_RECEIVED"
                            : "RECEIVED",
                    },
                    where: { id: purchaseOrder.id },
                });

                return goodsReceipt;
            })
        ).catch(async (error) => {
            if (!(isUniqueConstraintError(error) && data.idempotencyKey)) {
                throw error;
            }

            const existingReceipt = await prisma.goodsReceipt.findUnique({
                where: { receiptNumber },
            });
            if (!existingReceipt) {
                throw new Error(
                    "Could not complete goods receipt. Please retry once."
                );
            }
            return existingReceipt;
        });

        await logActivity({
            action: "PURCHASE_ORDER_GOODS_RECEIVED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    itemCount: data.items.length,
                    purchaseOrderId: data.purchaseOrderId,
                    receiptNumber: result.receiptNumber,
                },
            },
            entity: "GoodsReceipt",
            entityId: result.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return result;
    });
