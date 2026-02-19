import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getPurchaseOrdersInputSchema = z.object({
    limit: z.number().int().min(1).max(200).optional().default(100),
    search: z.string().trim().max(100).optional(),
    status: z
        .enum([
            "DRAFT",
            "SUBMITTED",
            "APPROVED",
            "PARTIALLY_RECEIVED",
            "RECEIVED",
            "CANCELLED",
        ])
        .optional(),
});

export const getPurchaseOrders = createServerFn({ method: "GET" })
    .inputValidator(getPurchaseOrdersInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.PURCHASE_ORDERS_VIEW_LIST
            )
        ) {
            throw new Error(
                "You do not have permission to view purchase orders."
            );
        }

        const orders = await prisma.purchaseOrder.findMany({
            include: {
                items: {
                    select: {
                        id: true,
                        productId: true,
                        quantity: true,
                        receivedQuantity: true,
                    },
                },
                supplier: {
                    select: { code: true, id: true, name: true },
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
                                  supplier: {
                                      name: {
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

        return orders.map((order) => ({
            ...order,
            items: order.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                receivedQuantity: Number(item.receivedQuantity),
            })),
        }));
    });
