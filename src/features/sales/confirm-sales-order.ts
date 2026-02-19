import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./sales-helpers";

export const confirmSalesOrder = createServerFn({ method: "POST" })
    .inputValidator(z.object({ salesOrderId: z.string().min(1) }))
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SALES_ORDERS_CONFIRM)) {
            throw new Error(
                "You do not have permission to confirm sales orders."
            );
        }

        const order = await prisma.salesOrder.findFirst({
            include: {
                customer: {
                    select: {
                        creditLimit: true,
                        id: true,
                        isActive: true,
                        name: true,
                    },
                },
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true },
                        },
                    },
                },
            },
            where: { deletedAt: null, id: data.salesOrderId },
        });
        if (!order) {
            throw new Error("Sales order not found.");
        }
        if (order.status !== "DRAFT") {
            throw new Error(
                `Cannot confirm an order in "${order.status}" status.`
            );
        }
        if (!order.customer.isActive) {
            throw new Error("Customer is inactive.");
        }

        if (
            order.customer.creditLimit !== null &&
            order.totalAmount > order.customer.creditLimit &&
            !canUser(
                context.session.user,
                PERMISSIONS.SALES_ORDERS_OVERRIDE_CREDIT_LIMIT
            )
        ) {
            throw new Error(
                "Order total exceeds customer credit limit. You need override permission to confirm this order."
            );
        }

        const updatedOrder = await prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                let remainingToReserve = toNumber(item.quantity);

                const stockItems = await tx.stockItem.findMany({
                    orderBy: [
                        { expiryDate: { nulls: "last", sort: "asc" } },
                        { createdAt: "asc" },
                    ],
                    where: {
                        productId: item.productId,
                        status: "AVAILABLE",
                    },
                });

                for (const stockItem of stockItems) {
                    if (remainingToReserve <= 0) {
                        break;
                    }

                    const availableQty =
                        toNumber(stockItem.quantity) -
                        toNumber(stockItem.reservedQuantity);
                    if (availableQty <= 0) {
                        continue;
                    }

                    const reserveQty = Math.min(
                        availableQty,
                        remainingToReserve
                    );
                    const updated = await tx.stockItem.updateMany({
                        data: { reservedQuantity: { increment: reserveQty } },
                        where: {
                            id: stockItem.id,
                            reservedQuantity: stockItem.reservedQuantity,
                        },
                    });

                    if (updated.count === 0) {
                        throw new Error(
                            "Stock changed while confirming the order. Please retry."
                        );
                    }

                    remainingToReserve -= reserveQty;
                }

                if (remainingToReserve > 0) {
                    throw new Error(
                        `Insufficient stock for "${item.product.name}". Unable to reserve ${remainingToReserve} more units.`
                    );
                }
            }

            return await tx.salesOrder.update({
                data: { status: "CONFIRMED" },
                where: { id: order.id },
            });
        });

        await logActivity({
            action: "SALES_ORDER_CONFIRMED",
            actorUserId: context.session.user.id,
            changes: {
                after: { status: "CONFIRMED" },
                before: { status: "DRAFT" },
            },
            entity: "SalesOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updatedOrder;
    });
