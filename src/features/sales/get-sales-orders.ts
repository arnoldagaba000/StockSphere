import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./sales-helpers";

export interface SalesOrderListItem {
    createdAt: Date;
    customer: {
        code: string;
        id: string;
        name: string;
    };
    customerId: string;
    deletedAt: Date | null;
    id: string;
    items: {
        id: string;
        productId: string;
        quantity: number;
        shippedQuantity: number;
    }[];
    notes: string | null;
    orderDate: Date;
    orderNumber: string;
    requiredDate: Date | null;
    shippedDate: Date | null;
    shippingAddress: string | null;
    shippingCost: number;
    status:
        | "CANCELLED"
        | "CONFIRMED"
        | "DELIVERED"
        | "DRAFT"
        | "FULFILLED"
        | "PARTIALLY_FULFILLED"
        | "SHIPPED";
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
    updatedAt: Date;
}

const getSalesOrdersInputSchema = z.object({
    limit: z.number().int().min(1).max(200).optional().default(100),
    search: z.string().trim().max(100).optional(),
    status: z
        .enum([
            "DRAFT",
            "CONFIRMED",
            "PARTIALLY_FULFILLED",
            "FULFILLED",
            "SHIPPED",
            "DELIVERED",
            "CANCELLED",
        ])
        .optional(),
});

export const getSalesOrders = createServerFn({ method: "GET" })
    .inputValidator(getSalesOrdersInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.SALES_ORDERS_VIEW_LIST)
        ) {
            throw new Error("You do not have permission to view sales orders.");
        }

        const orders = await prisma.salesOrder.findMany({
            include: {
                customer: {
                    select: { code: true, id: true, name: true },
                },
                items: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        shippedQuantity: true,
                    },
                },
            },
            orderBy: [{ createdAt: "desc" }],
            take: data.limit,
            where: {
                deletedAt: null,
                ...(data.status ? { status: data.status } : {}),
                ...(data.search
                    ? {
                          OR: [
                              {
                                  orderNumber: {
                                      contains: data.search,
                                      mode: "insensitive",
                                  },
                              },
                              {
                                  customer: {
                                      name: {
                                          contains: data.search,
                                          mode: "insensitive",
                                      },
                                  },
                              },
                              {
                                  customer: {
                                      code: {
                                          contains: data.search,
                                          mode: "insensitive",
                                      },
                                  },
                              },
                          ],
                      }
                    : {}),
            },
        });

        return orders.map(
            (order): SalesOrderListItem => ({
                ...order,
                items: order.items.map((item) => ({
                    ...item,
                    quantity: toNumber(item.quantity),
                    shippedQuantity: toNumber(item.shippedQuantity),
                })),
            })
        );
    });
