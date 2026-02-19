import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const markDeliveredInputSchema = z.object({
    deliveredAt: z.date().optional(),
    salesOrderId: z.string().min(1),
});

export const markSalesOrderDelivered = createServerFn({ method: "POST" })
    .inputValidator(markDeliveredInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.SALES_ORDERS_MARK_DELIVERED
            )
        ) {
            throw new Error(
                "You do not have permission to mark orders delivered."
            );
        }

        const order = await prisma.salesOrder.findFirst({
            where: { deletedAt: null, id: data.salesOrderId },
        });
        if (!order) {
            throw new Error("Sales order not found.");
        }

        if (!["SHIPPED", "FULFILLED"].includes(order.status)) {
            throw new Error(
                `Cannot mark order as delivered from "${order.status}" status.`
            );
        }

        const deliveredAt = data.deliveredAt ?? new Date();

        const updated = await prisma.$transaction(async (tx) => {
            await tx.shipment.updateMany({
                data: {
                    deliveredDate: deliveredAt,
                    status: "DELIVERED",
                },
                where: { salesOrderId: order.id },
            });

            return await tx.salesOrder.update({
                data: {
                    shippedDate: order.shippedDate ?? deliveredAt,
                    status: "DELIVERED",
                },
                where: { id: order.id },
            });
        });

        await logActivity({
            action: "SALES_ORDER_DELIVERED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    deliveredAt,
                    status: "DELIVERED",
                },
                before: { status: order.status },
            },
            entity: "SalesOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updated;
    });
