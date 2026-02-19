import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const cancelPurchaseOrderSchema = z.object({
    purchaseOrderId: z.string().cuid("Invalid purchase order id"),
    reason: z.string().trim().max(300).optional(),
});

export const cancelPurchaseOrder = createServerFn({ method: "POST" })
    .inputValidator(cancelPurchaseOrderSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.PURCHASE_ORDERS_CANCEL)
        ) {
            throw new Error(
                "You do not have permission to cancel purchase orders."
            );
        }

        const order = await prisma.purchaseOrder.findUnique({
            include: {
                items: {
                    select: {
                        id: true,
                        quantity: true,
                        receivedQuantity: true,
                    },
                },
            },
            where: { id: data.purchaseOrderId },
        });

        if (!order) {
            throw new Error("Purchase order not found.");
        }

        if (order.status === "CANCELLED") {
            throw new Error("Purchase order is already cancelled.");
        }

        const hasReceivedStock = order.items.some(
            (item) => Number(item.receivedQuantity) > 0
        );
        if (hasReceivedStock) {
            throw new Error(
                "Cannot cancel a purchase order with received quantities."
            );
        }

        const updatedOrder = await prisma.purchaseOrder.update({
            data: {
                notes: data.reason
                    ? `${order.notes ?? ""}\n[CANCELLED REASON] ${data.reason}`.trim()
                    : order.notes,
                status: "CANCELLED",
            },
            where: { id: order.id },
        });

        await logActivity({
            action: "PURCHASE_ORDER_CANCELLED",
            actorUserId: context.session.user.id,
            changes: {
                after: { status: "CANCELLED" },
                before: { status: order.status },
                reason: data.reason ?? null,
            },
            entity: "PurchaseOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updatedOrder;
    });
