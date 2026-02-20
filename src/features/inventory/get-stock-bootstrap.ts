import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import type { AppPermission } from "@/lib/auth/permissions";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const requirePermission = (
    user: { isActive?: boolean | null; role?: string | null },
    permission: AppPermission,
    message: string
) => {
    if (!canUser(user, permission)) {
        throw new Error(message);
    }
};

const assertBootstrapPermissions = (user: {
    isActive?: boolean | null;
    role?: string | null;
}) => {
    requirePermission(
        user,
        PERMISSIONS.WAREHOUSES_VIEW_LIST,
        "You do not have permission to view warehouses."
    );
    requirePermission(
        user,
        PERMISSIONS.PRODUCTS_VIEW_LIST,
        "You do not have permission to view products."
    );
    requirePermission(
        user,
        PERMISSIONS.INVENTORY_STOCK_OVERVIEW,
        "You do not have permission to view stock."
    );
    requirePermission(
        user,
        PERMISSIONS.REPORTS_DASHBOARD_KPI_VIEW,
        "You do not have permission to view inventory KPIs."
    );
    requirePermission(
        user,
        PERMISSIONS.REPORTS_INVENTORY_VALUATION_VIEW,
        "You do not have permission to view inventory valuation reports."
    );
};

export const getStockBootstrap = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        assertBootstrapPermissions(context.session.user);

        const [warehouses, products, stockItems, stockTotal] =
            await Promise.all([
                prisma.warehouse.findMany({
                    where: {
                        deletedAt: null,
                        isActive: true,
                    },
                    orderBy: { name: "asc" },
                    include: { _count: { select: { locations: true } } },
                }),
                prisma.product.findMany({
                    where: {
                        deletedAt: null,
                        isActive: true,
                    },
                    orderBy: [{ name: "asc" }, { createdAt: "desc" }],
                    take: 200,
                    include: { category: true },
                }),
                prisma.stockItem.findMany({
                    where: { status: "AVAILABLE" },
                    skip: 0,
                    take: 150,
                    include: {
                        location: true,
                        product: { include: { category: true } },
                        warehouse: true,
                    },
                    orderBy: [
                        { product: { name: "asc" } },
                        { warehouse: { name: "asc" } },
                    ],
                }),
                prisma.stockItem.count({
                    where: { status: "AVAILABLE" },
                }),
            ]);

        let totalOnHand = 0;
        let totalReserved = 0;
        let totalValue = 0;
        let lowStockBuckets = 0;
        let expiringSoonBuckets = 0;

        const now = new Date();
        const expiryCutoff = new Date();
        expiryCutoff.setDate(expiryCutoff.getDate() + 30);

        for (const item of stockItems) {
            const quantity = toNumber(item.quantity);
            const reservedQuantity = toNumber(item.reservedQuantity);
            totalOnHand += quantity;
            totalReserved += reservedQuantity;
            totalValue += quantity * (item.unitCost ?? 0);

            if (
                item.product.reorderPoint !== null &&
                quantity <= item.product.reorderPoint
            ) {
                lowStockBuckets += 1;
            }

            if (
                item.expiryDate &&
                item.expiryDate >= now &&
                item.expiryDate <= expiryCutoff
            ) {
                expiringSoonBuckets += 1;
            }
        }

        const byWarehouse = new Map<
            string,
            { id: string; name: string; value: number }
        >();
        const byLocation = new Map<
            string,
            { id: string; name: string; value: number }
        >();
        const byCategory = new Map<
            string,
            { id: string; name: string; value: number }
        >();

        for (const item of stockItems) {
            const itemValue = toNumber(item.quantity) * (item.unitCost ?? 0);
            const warehouseEntry = byWarehouse.get(item.warehouseId) ?? {
                id: item.warehouseId,
                name: item.warehouse.name,
                value: 0,
            };
            warehouseEntry.value += itemValue;
            byWarehouse.set(item.warehouseId, warehouseEntry);

            if (item.locationId && item.location) {
                const locationEntry = byLocation.get(item.locationId) ?? {
                    id: item.locationId,
                    name: `${item.location.code} - ${item.location.name}`,
                    value: 0,
                };
                locationEntry.value += itemValue;
                byLocation.set(item.locationId, locationEntry);
            }

            const categoryKey = item.product.categoryId ?? "uncategorized";
            const categoryEntry = byCategory.get(categoryKey) ?? {
                id: categoryKey,
                name: item.product.category?.name ?? "Uncategorized",
                value: 0,
            };
            categoryEntry.value += itemValue;
            byCategory.set(categoryKey, categoryEntry);
        }

        const stockData = {
            page: 1,
            pageSize: 150,
            stockItems: stockItems.map((item) => ({
                ...item,
                availableQuantity:
                    toNumber(item.quantity) - toNumber(item.reservedQuantity),
                product: {
                    ...item.product,
                    weight:
                        item.product.weight === null
                            ? null
                            : Number(item.product.weight),
                },
                quantity: toNumber(item.quantity),
                reservedQuantity: toNumber(item.reservedQuantity),
                unitCostDisplay: item.unitCost,
            })),
            total: stockTotal,
        };

        const valuation = {
            byCategory: [...byCategory.values()],
            byLocation: [...byLocation.values()],
            byWarehouse: [...byWarehouse.values()],
            totalValue,
        };

        const kpis = {
            expiringSoonBuckets,
            lowStockBuckets,
            stockBuckets: stockItems.length,
            totalAvailable: totalOnHand - totalReserved,
            totalOnHand,
            totalReserved,
            totalValue,
        };

        return {
            initialStock: stockData,
            initialValuation: valuation,
            kpis,
            products: products.map((product) => ({
                ...product,
                weight: product.weight === null ? null : Number(product.weight),
            })),
            warehouses,
        };
    });
