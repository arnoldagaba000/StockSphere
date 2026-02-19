import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./sales-helpers";

const cancelSalesOrderInputSchema = z.object({
    reason: z.string().trim().min(1, "Cancellation reason is required"),
    salesOrderId: z.string().min(1),
});

const appendCancellationNote = (
    existingNotes: string | null,
    reason: string
): string => {
    const cancellationStamp = `Cancelled: ${new Date().toISOString()} - ${reason}`;
    return existingNotes
        ? `${existingNotes}\n${cancellationStamp}`
        : cancellationStamp;
};

const releaseReservedStockForOrder = async (
    tx: Prisma.TransactionClient,
    productId: string,
    quantityToRelease: number
): Promise<void> => {
    let remainingToRelease = quantityToRelease;

    const reservedBuckets = await tx.stockItem.findMany({
        orderBy: [{ updatedAt: "asc" }],
        where: {
            productId,
            reservedQuantity: { gt: 0 },
        },
    });

    for (const bucket of reservedBuckets) {
        if (remainingToRelease <= 0) {
            break;
        }

        const releasableQty = Math.min(
            remainingToRelease,
            toNumber(bucket.reservedQuantity)
        );
        if (releasableQty <= 0) {
            continue;
        }

        await tx.stockItem.update({
            data: {
                reservedQuantity: {
                    decrement: releasableQty,
                },
            },
            where: { id: bucket.id },
        });

        remainingToRelease -= releasableQty;
    }

    if (remainingToRelease > 0) {
        throw new Error(
            "Unable to release all reserved stock for cancellation."
        );
    }
};

export const cancelSalesOrder = createServerFn({ method: "POST" })
    .inputValidator(cancelSalesOrderInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SALES_ORDERS_CANCEL)) {
            throw new Error(
                "You do not have permission to cancel sales orders."
            );
        }

        const order = await prisma.salesOrder.findFirst({
            include: { items: true },
            where: { deletedAt: null, id: data.salesOrderId },
        });
        if (!order) {
            throw new Error("Sales order not found.");
        }

        if (!["DRAFT", "CONFIRMED"].includes(order.status)) {
            throw new Error(
                `Cannot cancel an order in "${order.status}" status. Contact a manager.`
            );
        }

        const cancelledOrder = await prisma.$transaction(async (tx) => {
            if (order.status === "CONFIRMED") {
                for (const item of order.items) {
                    await releaseReservedStockForOrder(
                        tx,
                        item.productId,
                        toNumber(item.quantity)
                    );
                }
            }

            return await tx.salesOrder.update({
                data: {
                    notes: appendCancellationNote(order.notes, data.reason),
                    status: "CANCELLED",
                },
                where: { id: order.id },
            });
        });

        await logActivity({
            action: "SALES_ORDER_CANCELLED",
            actorUserId: context.session.user.id,
            changes: {
                after: { status: "CANCELLED" },
                before: { status: order.status },
                metadata: { reason: data.reason },
            },
            entity: "SalesOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return cancelledOrder;
    });
