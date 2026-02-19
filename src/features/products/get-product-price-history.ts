import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getProductPriceHistoryInputSchema = z.object({
    productId: z.string().cuid("Invalid product id"),
});

export const getProductPriceHistory = createServerFn({ method: "GET" })
    .inputValidator(getProductPriceHistoryInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_DETAIL)) {
            throw new Error(
                "You do not have permission to view product history."
            );
        }

        const entries = await prisma.productPriceHistory.findMany({
            orderBy: { effectiveAt: "desc" },
            select: {
                costPrice: true,
                createdAt: true,
                effectiveAt: true,
                reason: true,
                sellingPrice: true,
                changedBy: {
                    select: {
                        name: true,
                    },
                },
            },
            where: {
                productId: data.productId,
            },
        });

        return entries.map((entry) => ({
            actorName: entry.changedBy.name,
            costPrice: entry.costPrice,
            createdAt: entry.createdAt,
            effectiveAt: entry.effectiveAt,
            reason: entry.reason,
            sellingPrice: entry.sellingPrice,
        }));
    });
