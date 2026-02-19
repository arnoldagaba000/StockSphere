import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

const valuationSchema = z.object({
    warehouseId: z.string().optional(),
});

export const getInventoryValuationReport = createServerFn({ method: "GET" })
    .inputValidator(valuationSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.REPORTS_INVENTORY_VALUATION_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to view inventory valuation reports."
            );
        }

        const items = await prisma.stockItem.findMany({
            where: {
                ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
            },
            include: {
                location: true,
                product: { include: { category: true } },
                warehouse: true,
            },
        });

        const byWarehouse = new Map<string, { name: string; value: number }>();
        const byLocation = new Map<string, { name: string; value: number }>();
        const byCategory = new Map<string, { name: string; value: number }>();

        let totalValue = 0;

        for (const item of items) {
            const itemValue = toNumber(item.quantity) * (item.unitCost ?? 0);
            totalValue += itemValue;

            const warehouseEntry = byWarehouse.get(item.warehouseId) ?? {
                name: item.warehouse.name,
                value: 0,
            };
            warehouseEntry.value += itemValue;
            byWarehouse.set(item.warehouseId, warehouseEntry);

            if (item.locationId && item.location) {
                const locationEntry = byLocation.get(item.locationId) ?? {
                    name: `${item.location.code} - ${item.location.name}`,
                    value: 0,
                };
                locationEntry.value += itemValue;
                byLocation.set(item.locationId, locationEntry);
            }

            const categoryKey = item.product.categoryId ?? "uncategorized";
            const categoryEntry = byCategory.get(categoryKey) ?? {
                name: item.product.category?.name ?? "Uncategorized",
                value: 0,
            };
            categoryEntry.value += itemValue;
            byCategory.set(categoryKey, categoryEntry);
        }

        return {
            byCategory: [...byCategory.entries()].map(([id, value]) => ({
                id,
                ...value,
            })),
            byLocation: [...byLocation.entries()].map(([id, value]) => ({
                id,
                ...value,
            })),
            byWarehouse: [...byWarehouse.entries()].map(([id, value]) => ({
                id,
                ...value,
            })),
            totalValue,
        };
    });

const kpiSchema = z.object({
    withinDays: z.preprocess(
        (value) => (value === undefined ? 30 : Number(value)),
        z.number().min(1).max(365)
    ),
});

export const getInventoryKpis = createServerFn({ method: "GET" })
    .inputValidator(kpiSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.REPORTS_DASHBOARD_KPI_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to view inventory KPIs."
            );
        }

        const now = new Date();
        const expiryCutoff = new Date();
        expiryCutoff.setDate(expiryCutoff.getDate() + data.withinDays);

        const stockItems = await prisma.stockItem.findMany({
            include: { product: true },
        });

        let totalOnHand = 0;
        let totalReserved = 0;
        let totalValue = 0;
        let lowStockBuckets = 0;
        let expiringSoonBuckets = 0;

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

        return {
            expiringSoonBuckets,
            lowStockBuckets,
            stockBuckets: stockItems.length,
            totalAvailable: totalOnHand - totalReserved,
            totalOnHand,
            totalReserved,
            totalValue,
        };
    });
