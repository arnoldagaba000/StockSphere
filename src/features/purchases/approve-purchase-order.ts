import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { assertOrderStatus } from "@/features/purchases/purchase-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const approvePurchaseOrderSchema = z.object({
    purchaseOrderId: z.string().cuid("Invalid purchase order id"),
});

export const approvePurchaseOrder = createServerFn({ method: "POST" })
    .inputValidator(approvePurchaseOrderSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.PURCHASE_ORDERS_APPROVE)
        ) {
            throw new Error(
                "You do not have permission to approve purchase orders."
            );
        }

        const order = await prisma.purchaseOrder.findUnique({
            select: { id: true, orderNumber: true, status: true },
            where: { id: data.purchaseOrderId },
        });
        if (!order) {
            throw new Error("Purchase order not found.");
        }

        assertOrderStatus(order.status, "SUBMITTED", "approve");

        const updatedOrder = await prisma.purchaseOrder.update({
            data: { status: "APPROVED" },
            where: { id: order.id },
        });

        await logActivity({
            action: "PURCHASE_ORDER_APPROVED",
            actorUserId: context.session.user.id,
            changes: {
                after: { status: "APPROVED" },
                before: { status: order.status },
                orderNumber: order.orderNumber,
            },
            entity: "PurchaseOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updatedOrder;
    });
