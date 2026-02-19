import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const updateSalesOrderDraftSchema = z.object({
    items: z
        .array(
            z.object({
                notes: z.string().trim().max(500).nullable().optional(),
                productId: z.string().min(1),
                quantity: z.number().positive(),
                taxRate: z.number().int().min(0).max(100),
                unitPrice: z.number().int().min(0),
            })
        )
        .min(1),
    notes: z.string().trim().max(1000).nullable().optional(),
    requiredDate: z.date().nullable().optional(),
    salesOrderId: z.string().min(1),
    shippingAddress: z.string().trim().max(500).nullable().optional(),
    shippingCost: z.number().int().min(0),
    taxAmount: z.number().int().min(0),
});

export const updateSalesOrderDraft = createServerFn({ method: "POST" })
    .inputValidator(updateSalesOrderDraftSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.SALES_ORDERS_EDIT_DRAFT)
        ) {
            throw new Error(
                "You do not have permission to edit draft sales orders."
            );
        }

        const order = await prisma.salesOrder.findFirst({
            include: {
                items: true,
            },
            where: { deletedAt: null, id: data.salesOrderId },
        });
        if (!order) {
            throw new Error("Sales order not found.");
        }
        if (order.status !== "DRAFT") {
            throw new Error("Only draft sales orders can be edited.");
        }

        const products = await prisma.product.findMany({
            select: { id: true, isActive: true },
            where: { id: { in: data.items.map((item) => item.productId) } },
        });
        const productMap = new Map(
            products.map((product) => [product.id, product])
        );

        for (const item of data.items) {
            const product = productMap.get(item.productId);
            if (!product?.isActive) {
                throw new Error(
                    `Product ${item.productId} is invalid or inactive.`
                );
            }
        }

        const itemRows = data.items.map((item) => {
            const lineNet = Math.round(item.quantity * item.unitPrice);
            const lineTax = Math.round(lineNet * (item.taxRate / 100));
            return {
                notes: item.notes ?? null,
                productId: item.productId,
                quantity: item.quantity,
                taxRate: item.taxRate,
                totalPrice: lineNet + lineTax,
                unitPrice: item.unitPrice,
            };
        });

        const subtotal = itemRows.reduce(
            (sum, item) => sum + Math.round(item.quantity * item.unitPrice),
            0
        );
        const computedTaxAmount = itemRows.reduce(
            (sum, item) =>
                sum +
                Math.round(
                    item.quantity * item.unitPrice * (item.taxRate / 100)
                ),
            0
        );
        const taxAmount = computedTaxAmount + data.taxAmount;
        const totalAmount = subtotal + taxAmount + data.shippingCost;

        const updated = await prisma.$transaction(async (tx) => {
            await tx.salesOrderItem.deleteMany({
                where: { salesOrderId: order.id },
            });

            return await tx.salesOrder.update({
                data: {
                    items: { create: itemRows },
                    notes: data.notes ?? null,
                    requiredDate: data.requiredDate ?? null,
                    shippingAddress: data.shippingAddress ?? null,
                    shippingCost: data.shippingCost,
                    subtotal,
                    taxAmount,
                    totalAmount,
                },
                where: { id: order.id },
            });
        });

        await logActivity({
            action: "SALES_ORDER_DRAFT_UPDATED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    itemCount: data.items.length,
                    subtotal,
                    totalAmount,
                },
                before: {
                    itemCount: order.items.length,
                    subtotal: order.subtotal,
                    totalAmount: order.totalAmount,
                },
            },
            entity: "SalesOrder",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updated;
    });
