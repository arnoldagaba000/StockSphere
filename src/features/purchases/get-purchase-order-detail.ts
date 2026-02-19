import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getPurchaseOrderDetailSchema = z.object({
    purchaseOrderId: z.string().cuid("Invalid purchase order id"),
});

export const getPurchaseOrderDetail = createServerFn({ method: "GET" })
    .inputValidator(getPurchaseOrderDetailSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.PURCHASE_ORDERS_VIEW_DETAIL
            )
        ) {
            throw new Error(
                "You do not have permission to view purchase order details."
            );
        }

        const purchaseOrder = await prisma.purchaseOrder.findFirst({
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                trackByBatch: true,
                                trackByExpiry: true,
                                trackBySerialNumber: true,
                            },
                        },
                    },
                    orderBy: [{ createdAt: "asc" }],
                },
                receipts: {
                    include: {
                        items: {
                            select: {
                                id: true,
                                productId: true,
                                quantity: true,
                                warehouseId: true,
                            },
                        },
                    },
                    orderBy: [{ receivedDate: "desc" }],
                },
                supplier: {
                    select: { code: true, id: true, name: true },
                },
            },
            where: { deletedAt: null, id: data.purchaseOrderId },
        });

        if (!purchaseOrder) {
            throw new Error("Purchase order not found.");
        }

        return {
            ...purchaseOrder,
            items: purchaseOrder.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
                receivedQuantity: Number(item.receivedQuantity),
            })),
            receipts: purchaseOrder.receipts.map((receipt) => ({
                ...receipt,
                items: receipt.items.map((item) => ({
                    ...item,
                    quantity: Number(item.quantity),
                })),
            })),
        };
    });
