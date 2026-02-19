import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { assertOrderStatus } from "@/features/purchases/purchase-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const transitionPurchaseOrderSchema = z.object({
    purchaseOrderId: z.string().cuid("Invalid purchase order id"),
});

export const submitPurchaseOrder = createServerFn({ method: "POST" })
    .inputValidator(transitionPurchaseOrderSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.PURCHASE_ORDERS_SUBMIT_FOR_APPROVAL
            )
        ) {
            throw new Error(
                "You do not have permission to submit purchase orders."
            );
        }

        const order = await prisma.purchaseOrder.findUnique({
            select: { id: true, orderNumber: true, status: true },
            where: { id: data.purchaseOrderId },
        });

        if (!order) {
            throw new Error("Purchase order not found.");
        }

        assertOrderStatus(order.status, "DRAFT", "submit");

        const updatedOrder = await prisma.purchaseOrder.update({
            data: { status: "SUBMITTED" },
            where: { id: data.purchaseOrderId },
        });

        await logActivity({
            action: "PURCHASE_ORDER_SUBMITTED",
            actorUserId: context.session.user.id,
            changes: {
                after: { status: "SUBMITTED" },
                before: { status: order.status },
                orderNumber: order.orderNumber,
            },
            entity: "PurchaseOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updatedOrder;
    });
