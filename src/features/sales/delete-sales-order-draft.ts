import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const deleteDraftInputSchema = z.object({
    salesOrderId: z.string().min(1),
});

export const deleteSalesOrderDraft = createServerFn({ method: "POST" })
    .inputValidator(deleteDraftInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.SALES_ORDERS_DELETE_DRAFT
            )
        ) {
            throw new Error(
                "You do not have permission to delete draft orders."
            );
        }

        const order = await prisma.salesOrder.findFirst({
            include: { items: true },
            where: { deletedAt: null, id: data.salesOrderId },
        });
        if (!order) {
            throw new Error("Sales order not found.");
        }

        if (order.status !== "DRAFT") {
            throw new Error("Only draft orders can be deleted.");
        }

        const deleted = await prisma.salesOrder.update({
            data: { deletedAt: new Date() },
            where: { id: order.id },
        });

        await logActivity({
            action: "SALES_ORDER_DRAFT_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                after: { deletedAt: deleted.deletedAt },
                before: { deletedAt: order.deletedAt, status: order.status },
            },
            entity: "SalesOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
