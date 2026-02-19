import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const parseQuantity = (value: { toString(): string } | null): number =>
    Number(value?.toString() ?? "0");

interface CategoryAnalyticsItem {
    activeProducts: number;
    categoryId: string;
    estimatedStockValueMinor: number;
    totalProducts: number;
}

export const getCategoryAnalytics = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (!canUser(context.session.user, PERMISSIONS.CATEGORIES_VIEW)) {
            throw new Error(
                "You do not have permission to view category analytics."
            );
        }

        const [products, stockItems] = await Promise.all([
            prisma.product.findMany({
                select: {
                    categoryId: true,
                    costPrice: true,
                    id: true,
                    isActive: true,
                },
                where: {
                    deletedAt: null,
                    categoryId: {
                        not: null,
                    },
                },
            }),
            prisma.stockItem.findMany({
                select: {
                    productId: true,
                    quantity: true,
                },
            }),
        ]);

        const productById = new Map(
            products.map((product) => [product.id, product])
        );
        const summaryByCategoryId = new Map<string, CategoryAnalyticsItem>();

        for (const product of products) {
            if (!product.categoryId) {
                continue;
            }

            const currentSummary = summaryByCategoryId.get(
                product.categoryId
            ) ?? {
                activeProducts: 0,
                categoryId: product.categoryId,
                estimatedStockValueMinor: 0,
                totalProducts: 0,
            };
            currentSummary.totalProducts += 1;
            if (product.isActive) {
                currentSummary.activeProducts += 1;
            }
            summaryByCategoryId.set(product.categoryId, currentSummary);
        }

        for (const stockItem of stockItems) {
            const product = productById.get(stockItem.productId);
            if (!product?.categoryId) {
                continue;
            }

            const currentSummary = summaryByCategoryId.get(product.categoryId);
            if (!currentSummary) {
                continue;
            }

            currentSummary.estimatedStockValueMinor += Math.round(
                parseQuantity(stockItem.quantity) * (product.costPrice ?? 0)
            );
        }

        return {
            categories: [...summaryByCategoryId.values()],
        };
    });
