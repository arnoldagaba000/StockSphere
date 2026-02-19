import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const getStock = createServerFn({ method: "GET" })
    .inputValidator(
        (input: {
            warehouseId?: string;
            productId?: string;
            belowReorder?: boolean;
            includeNonAvailable?: boolean;
            page?: number;
            pageSize?: number;
        }) => input
    )
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.INVENTORY_STOCK_OVERVIEW)
        ) {
            throw new Error("You do not have permission to view stock.");
        }

        const page = Math.max(1, Math.floor(data.page ?? 1));
        const pageSize = Math.min(
            200,
            Math.max(1, Math.floor(data.pageSize ?? 50))
        );

        const where = {
            ...(data.includeNonAvailable
                ? {}
                : { status: "AVAILABLE" as const }),
            ...(data.warehouseId && { warehouseId: data.warehouseId }),
            ...(data.productId && { productId: data.productId }),
        };

        const [total, stockItems] = await Promise.all([
            prisma.stockItem.count({ where }),
            prisma.stockItem.findMany({
                where,
                skip: (page - 1) * pageSize,
                take: pageSize,
                include: {
                    product: {
                        include: { category: true },
                    },
                    warehouse: true,
                    location: true,
                },
                orderBy: [
                    { product: { name: "asc" } },
                    { warehouse: { name: "asc" } },
                ],
            }),
        ]);

        const filtered = data.belowReorder
            ? stockItems.filter(
                  (item) =>
                      item.product.reorderPoint !== null &&
                      Number(item.quantity) <= item.product.reorderPoint
              )
            : stockItems;

        const enriched = filtered.map((item) => ({
            ...item,
            availableQuantity:
                Number(item.quantity) - Number(item.reservedQuantity),
            product: {
                ...item.product,
                weight:
                    item.product.weight === null
                        ? null
                        : Number(item.product.weight),
            },
            quantity: Number(item.quantity),
            reservedQuantity: Number(item.reservedQuantity),
            unitCostDisplay: item.unitCost,
        }));

        return { stockItems: enriched, total, page, pageSize };
    });
