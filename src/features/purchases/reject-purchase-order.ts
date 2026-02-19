import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { assertOrderStatus } from "@/features/purchases/purchase-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const rejectPurchaseOrderSchema = z.object({
    purchaseOrderId: z.string().cuid("Invalid purchase order id"),
    reason: z.string().trim().max(300).optional(),
});

export const rejectPurchaseOrder = createServerFn({ method: "POST" })
    .inputValidator(rejectPurchaseOrderSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.PURCHASE_ORDERS_REJECT)
        ) {
            throw new Error(
                "You do not have permission to reject purchase orders."
            );
        }

        const order = await prisma.purchaseOrder.findUnique({
            select: { id: true, orderNumber: true, status: true },
            where: { id: data.purchaseOrderId },
        });
        if (!order) {
            throw new Error("Purchase order not found.");
        }

        assertOrderStatus(order.status, "SUBMITTED", "reject");

        const updatedOrder = await prisma.purchaseOrder.update({
            data: { status: "DRAFT" },
            where: { id: order.id },
        });

        await logActivity({
            action: "PURCHASE_ORDER_REJECTED",
            actorUserId: context.session.user.id,
            changes: {
                after: { status: "DRAFT" },
                before: { status: order.status },
                orderNumber: order.orderNumber,
                reason: data.reason ?? null,
            },
            entity: "PurchaseOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updatedOrder;
    });
