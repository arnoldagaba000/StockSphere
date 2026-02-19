import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getGoodsReceiptsInputSchema = z.object({
    limit: z.number().int().min(1).max(200).optional().default(100),
    purchaseOrderId: z.string().cuid().optional(),
    search: z.string().trim().max(100).optional(),
});

export const getGoodsReceipts = createServerFn({ method: "GET" })
    .inputValidator(getGoodsReceiptsInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.GOODS_RECEIPTS_VIEW_LIST)
        ) {
            throw new Error(
                "You do not have permission to view goods receipts."
            );
        }

        const receipts = await prisma.goodsReceipt.findMany({
            include: {
                items: {
                    include: {
                        product: {
                            select: { id: true, name: true, sku: true },
                        },
                        warehouse: {
                            select: { code: true, id: true, name: true },
                        },
                    },
                },
                purchaseOrder: {
                    include: {
                        supplier: {
                            select: { code: true, id: true, name: true },
                        },
                    },
                },
            },
            orderBy: [{ receivedDate: "desc" }],
            take: data.limit,
            where: {
                ...(data.purchaseOrderId
                    ? { purchaseOrderId: data.purchaseOrderId }
                    : {}),
                ...(data.search
                    ? {
                          OR: [
                              {
                                  receiptNumber: {
                                      contains: data.search,
                                      mode: "insensitive",
                                  },
                              },
                              {
                                  purchaseOrder: {
                                      orderNumber: {
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

        return receipts.map((receipt) => ({
            ...receipt,
            isVoided: Boolean(receipt.notes?.includes("[VOIDED]")),
            items: receipt.items.map((item) => ({
                ...item,
                quantity: Number(item.quantity),
            })),
        }));
    });
