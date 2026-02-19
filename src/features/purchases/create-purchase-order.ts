import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { generatePurchaseOrderNumber } from "@/features/purchases/purchase-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { purchaseOrderSchema } from "@/schemas/purchase-order-schema";

export const createPurchaseOrder = createServerFn({ method: "POST" })
    .inputValidator(purchaseOrderSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.PURCHASE_ORDERS_CREATE_DRAFT
            )
        ) {
            throw new Error(
                "You do not have permission to create purchase orders."
            );
        }

        const [supplier, products] = await Promise.all([
            prisma.supplier.findFirst({
                select: { id: true, isActive: true },
                where: { deletedAt: null, id: data.supplierId },
            }),
            prisma.product.findMany({
                select: { id: true, isActive: true },
                where: { id: { in: data.items.map((item) => item.productId) } },
            }),
        ]);

        if (!supplier?.isActive) {
            throw new Error("Selected supplier is invalid or inactive.");
        }

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

        const order = await prisma.$transaction(async (tx) => {
            const orderNumber = await generatePurchaseOrderNumber(tx);

            const itemsWithTotals = data.items.map((item) => {
                const unitPrice = Math.round(item.unitPrice);
                const totalPrice = Math.round(item.quantity * unitPrice);
                return {
                    notes: item.notes ?? null,
                    productId: item.productId,
                    quantity: item.quantity,
                    taxRate: item.taxRate,
                    totalPrice,
                    unitPrice,
                };
            });

            const subtotal = itemsWithTotals.reduce(
                (sum, item) => sum + item.totalPrice,
                0
            );
            const taxAmount = Math.round(data.taxAmount);
            const shippingCost = Math.round(data.shippingCost);
            const totalAmount = subtotal + taxAmount + shippingCost;

            return await tx.purchaseOrder.create({
                data: {
                    createdById: context.session.user.id,
                    expectedDate: data.expectedDate ?? null,
                    notes: data.notes ?? null,
                    orderNumber,
                    shippingCost,
                    status: "DRAFT",
                    subtotal,
                    supplierId: data.supplierId,
                    taxAmount,
                    totalAmount,
                    items: { create: itemsWithTotals },
                },
                include: {
                    items: true,
                    supplier: {
                        select: { code: true, id: true, name: true },
                    },
                },
            });
        });

        await logActivity({
            action: "PURCHASE_ORDER_CREATED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    itemCount: order.items.length,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    supplierId: order.supplierId,
                    totalAmount: order.totalAmount,
                },
            },
            entity: "PurchaseOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            ...order,
            items: order.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                receivedQuantity: Number(item.receivedQuantity),
            })),
        };
    });
