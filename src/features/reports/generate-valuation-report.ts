import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const valuationReportSchema = z.object({
    categoryId: z.string().optional(),
    format: z.enum(["csv", "json"]).default("json"),
    includeZeroQuantity: z.boolean().default(false),
    warehouseId: z.string().optional(),
});

export const generateValuationReport = createServerFn({ method: "POST" })
    .inputValidator(valuationReportSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.REPORTS_INVENTORY_VALUATION_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to generate valuation reports."
            );
        }

        const where = {
            status: "AVAILABLE" as const,
            ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
            ...(data.includeZeroQuantity ? {} : { quantity: { gt: 0 } }),
            ...(data.categoryId
                ? { product: { categoryId: data.categoryId } }
                : {}),
        };

        const stockItems = await prisma.stockItem.findMany({
            where,
            include: {
                location: { select: { code: true } },
                product: {
                    include: { category: { select: { name: true } } },
                },
                warehouse: { select: { code: true, name: true } },
            },
            orderBy: [
                { product: { name: "asc" } },
                { warehouse: { name: "asc" } },
            ],
        });

        const rows = stockItems.map((item) => {
            const quantity = toNumber(item.quantity);
            const reservedQuantity = toNumber(item.reservedQuantity);
            const availableQuantity = quantity - reservedQuantity;
            const unitCostMinor = item.unitCost ?? 0;
            const totalValueMinor = quantity * unitCostMinor;
            const reorderPoint = item.product.reorderPoint ?? 0;

            return {
                availableQuantity,
                batchNumber: item.batchNumber ?? "—",
                category: item.product.category?.name ?? "Uncategorized",
                expiryDate: item.expiryDate?.toISOString().slice(0, 10) ?? "—",
                isBelowReorder:
                    reorderPoint > 0 && availableQuantity <= reorderPoint,
                location: item.location?.code ?? "—",
                productName: item.product.name,
                quantity,
                reorderPoint,
                reservedQuantity,
                sku: item.product.sku,
                totalValueMinor,
                unit: item.product.unit,
                unitCostMinor,
                warehouse: item.warehouse.name,
            };
        });

        const summary = {
            generatedAt: new Date().toISOString(),
            generatedBy: context.session.user.email,
            itemsBelowReorder: rows.filter((row) => row.isBelowReorder).length,
            totalQuantity: rows.reduce((sum, row) => sum + row.quantity, 0),
            totalUniqueProducts: new Set(rows.map((row) => row.sku)).size,
            totalValueMinor: rows.reduce(
                (sum, row) => sum + row.totalValueMinor,
                0
            ),
        };

        if (data.format === "json") {
            return { rows, summary };
        }

        const headers = [
            "SKU",
            "Product",
            "Category",
            "Warehouse",
            "Location",
            "Batch",
            "Expiry Date",
            "Qty",
            "Reserved",
            "Available",
            "Unit",
            "Unit Cost (Minor)",
            "Total Value (Minor)",
            "Below Reorder",
        ];
        const csvRows = rows.map((row) => [
            row.sku,
            row.productName,
            row.category,
            row.warehouse,
            row.location,
            row.batchNumber,
            row.expiryDate,
            row.quantity,
            row.reservedQuantity,
            row.availableQuantity,
            row.unit,
            row.unitCostMinor,
            row.totalValueMinor,
            row.isBelowReorder ? "Yes" : "No",
        ]);
        const csv = [headers, ...csvRows]
            .map((row) =>
                row
                    .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                    .join(",")
            )
            .join("\n");

        return {
            content: csv,
            filename: `valuation-${Date.now()}.csv`,
            format: "csv",
            summary,
        };
    });
