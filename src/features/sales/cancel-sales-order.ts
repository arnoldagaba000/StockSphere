import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";

export const cancelSalesOrder = createServerFn({ method: "POST" })
    .inputValidator(
        z.object({ salesOrderId: z.string(), reason: z.string().min(1) })
    )
    .handler(async ({ data, request }) => {
        const session = await requireAuth({ request, requiredRole: "STAFF" });

        const order = await prisma.salesOrder.findUnique({
            where: { id: data.salesOrderId },
            include: { items: true },
        });
        if (!order) {
            throw new Error("Sales order not found");
        }

        // Only DRAFT and CONFIRMED orders can be cancelled.
        // Once partially fulfilled, a manager must handle it manually
        // because some stock has already shipped.
        if (!["DRAFT", "CONFIRMED"].includes(order.status)) {
            throw new Error(
                `Cannot cancel an order in "${order.status}" status. Contact a manager.`
            );
        }

        return prisma.$transaction(async (tx) => {
            // If the order was CONFIRMED, reservations are held — release them.
            // For DRAFT orders, no reservations were made, so this loop does nothing.
            if (order.status === "CONFIRMED") {
                for (const item of order.items) {
                    // Find all StockItem rows that have reservations for this order's product
                    // and warehouse, then release them proportionally.
                    // The safest approach: reduce reservedQuantity by the item's quantity,
                    // clamped to 0 so we never go negative.
                    const stockItems = await tx.stockItem.findMany({
                        where: {
                            productId: item.productId,
                            warehouseId: order.warehouseId,
                            reservedQuantity: { gt: 0 },
                        },
                    });

                    let remainingToRelease = Number(item.quantity);
                    for (const stock of stockItems) {
                        if (remainingToRelease <= 0) {
                            break;
                        }
                        const toRelease = Math.min(
                            Number(stock.reservedQuantity),
                            remainingToRelease
                        );
                        await tx.stockItem.update({
                            where: { id: stock.id },
                            data: {
                                reservedQuantity: { decrement: toRelease },
                            },
                        });
                        remainingToRelease -= toRelease;
                    }
                }
            }

            await tx.salesOrder.update({
                where: { id: data.salesOrderId },
                data: { status: "CANCELLED", cancellationReason: data.reason },
            });

            await tx.activityLog.create({
                data: {
                    userId: session.user.id,
                    action: "UPDATE",
                    entity: "SalesOrder",
                    entityId: order.id,
                    changes: {
                        before: { status: order.status },
                        after: { status: "CANCELLED" },
                        reason: data.reason,
                    },
                },
            });
        });
    });
