import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { getNumberingPrefixes } from "@/features/settings/get-numbering-prefixes";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { salesOrderSchema } from "@/schemas/sales-order-schema";
import {
    generateSalesOrderNumber,
    retryOnUniqueConstraint,
    toNumber,
} from "./sales-helpers";

export const createSalesOrder = createServerFn({ method: "POST" })
    .inputValidator(salesOrderSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.SALES_ORDERS_CREATE_DRAFT
            )
        ) {
            throw new Error(
                "You do not have permission to create sales orders."
            );
        }

        const [customer, numberingPrefixes, products] = await Promise.all([
            prisma.customer.findFirst({
                select: { creditLimit: true, id: true, isActive: true },
                where: { deletedAt: null, id: data.customerId },
            }),
            getNumberingPrefixes(),
            prisma.product.findMany({
                select: { id: true, isActive: true },
                where: { id: { in: data.items.map((item) => item.productId) } },
            }),
        ]);

        if (!customer?.isActive) {
            throw new Error("Selected customer is invalid or inactive.");
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

        const itemRows = data.items.map((item) => {
            const quantity = item.quantity;
            const discountAmount = Math.round(
                item.quantity *
                    item.unitPrice *
                    ((item.discountPercent ?? 0) / 100)
            );
            const netBeforeTax =
                item.quantity * item.unitPrice - discountAmount;
            const lineTax = Math.round(netBeforeTax * (item.taxRate / 100));
            const totalPrice = netBeforeTax + lineTax;

            return {
                notes: item.notes ?? null,
                productId: item.productId,
                quantity,
                taxRate: item.taxRate,
                totalPrice,
                unitPrice: item.unitPrice,
            };
        });

        const subtotal = itemRows.reduce(
            (sum, item) =>
                sum + Math.round(toNumber(item.quantity) * item.unitPrice),
            0
        );
        const computedTaxAmount = itemRows.reduce((sum, item) => {
            const lineBase = Math.round(
                toNumber(item.quantity) * item.unitPrice
            );
            return sum + Math.round(lineBase * (item.taxRate / 100));
        }, 0);
        const taxAmount = computedTaxAmount + data.taxAmount;
        const shippingCost = data.shippingCost;
        const totalAmount = subtotal + taxAmount + shippingCost;

        if (
            customer.creditLimit !== null &&
            totalAmount > customer.creditLimit &&
            !canUser(
                context.session.user,
                PERMISSIONS.SALES_ORDERS_OVERRIDE_CREDIT_LIMIT
            )
        ) {
            throw new Error(
                "Order total exceeds customer credit limit. You need override permission to continue."
            );
        }

        const order = await retryOnUniqueConstraint(async () =>
            prisma.salesOrder.create({
                data: {
                    createdById: context.session.user.id,
                    customerId: data.customerId,
                    notes: data.notes ?? null,
                    orderNumber: generateSalesOrderNumber(
                        numberingPrefixes.salesOrder
                    ),
                    requiredDate: data.requiredDate ?? null,
                    shippingAddress: data.shippingAddress ?? null,
                    shippingCost,
                    status: "DRAFT",
                    subtotal,
                    taxAmount,
                    totalAmount,
                    items: { create: itemRows },
                },
                include: {
                    customer: {
                        select: { code: true, id: true, name: true },
                    },
                    items: true,
                },
            })
        );

        await logActivity({
            action: "SALES_ORDER_CREATED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    customerId: order.customerId,
                    itemCount: order.items.length,
                    orderNumber: order.orderNumber,
                    status: order.status,
                    totalAmount: order.totalAmount,
                },
            },
            entity: "SalesOrder",
            entityId: order.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            ...order,
            items: order.items.map((item) => ({
                ...item,
                quantity: toNumber(item.quantity),
                shippedQuantity: toNumber(item.shippedQuantity),
            })),
        };
    });
