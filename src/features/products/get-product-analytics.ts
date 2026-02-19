import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const parseQuantity = (value: { toString(): string } | null): number =>
    Number(value?.toString() ?? "0");

export const getProductAnalytics = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_LIST)) {
            throw new Error(
                "You do not have permission to view product analytics."
            );
        }

        const [products, stockItems] = await Promise.all([
            prisma.product.findMany({
                select: {
                    costPrice: true,
                    id: true,
                    isActive: true,
                },
                where: {
                    deletedAt: null,
                },
            }),
            prisma.stockItem.findMany({
                select: {
                    productId: true,
                    quantity: true,
                },
            }),
        ]);

        const costPriceByProductId = new Map(
            products.map((product) => [product.id, product.costPrice ?? 0])
        );

        let stockValueMinor = 0;
        for (const stockItem of stockItems) {
            const costPriceMinor =
                costPriceByProductId.get(stockItem.productId) ?? 0;
            stockValueMinor += Math.round(
                parseQuantity(stockItem.quantity) * costPriceMinor
            );
        }

        return {
            activeProducts: products.filter((product) => product.isActive)
                .length,
            inactiveProducts: products.filter((product) => !product.isActive)
                .length,
            stockValueMinor,
            totalProducts: products.length,
        };
    });
