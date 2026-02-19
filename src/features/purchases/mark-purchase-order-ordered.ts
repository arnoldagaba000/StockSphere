import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const markPurchaseOrderOrderedSchema = z.object({
    purchaseOrderId: z.string().cuid("Invalid purchase order id"),
});

const appendOrderMarker = (
    currentNotes: string | null,
    actorUserId: string
): string => {
    const marker = `[ORDERED ${new Date().toISOString()} by ${actorUserId}]`;
    return currentNotes ? `${currentNotes}\n${marker}` : marker;
};

export const markPurchaseOrderOrdered = createServerFn({ method: "POST" })
    .inputValidator(markPurchaseOrderOrderedSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.PURCHASE_ORDERS_MARK_ORDERED
            )
        ) {
            throw new Error(
                "You do not have permission to mark purchase orders as ordered."
            );
        }

        const order = await prisma.purchaseOrder.findUnique({
            select: { id: true, notes: true, orderNumber: true, status: true },
            where: { id: data.purchaseOrderId },
        });
        if (!order) {
            throw new Error("Purchase order not found.");
        }

        if (
            order.status !== "APPROVED" &&
            order.status !== "PARTIALLY_RECEIVED"
        ) {
            throw new Error(
                `Only approved purchase orders can be marked ordered. Current status is "${order.status}".`
            );
        }

        const updatedOrder = await prisma.purchaseOrder.update({
            data: {
                notes: appendOrderMarker(order.notes, context.session.user.id),
            },
            where: { id: order.id },
        });

        await logActivity({
            action: "PURCHASE_ORDER_MARKED_ORDERED",
            actorUserId: context.session.user.id,
            changes: {
                after: { status: updatedOrder.status },
                before: { status: order.status },
                orderNumber: order.orderNumber,
            },
            entity: "PurchaseOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updatedOrder;
    });
