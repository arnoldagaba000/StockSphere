import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const MOVEMENT_TYPES = [
    "PURCHASE_RECEIPT",
    "SALES_SHIPMENT",
    "TRANSFER",
    "ADJUSTMENT",
    "RETURN",
    "ASSEMBLY",
    "DISASSEMBLY",
] as const;

const movementReportSchema = z
    .object({
        dateFrom: z.coerce.date(),
        dateTo: z.coerce.date(),
        format: z.enum(["csv", "json"]).default("json"),
        movementTypes: z.array(z.enum(MOVEMENT_TYPES)).optional(),
        productId: z.string().optional(),
        warehouseId: z.string().optional(),
    })
    .refine((value) => value.dateFrom <= value.dateTo, {
        message: "dateFrom must be before or equal to dateTo",
        path: ["dateFrom"],
    });

export const generateMovementReport = createServerFn({ method: "POST" })
    .inputValidator(movementReportSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.REPORTS_STOCK_MOVEMENT_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to generate movement reports."
            );
        }

        const where = {
            createdAt: {
                gte: data.dateFrom,
                lte: data.dateTo,
            },
            ...(data.productId ? { productId: data.productId } : {}),
            ...(data.movementTypes?.length
                ? { type: { in: data.movementTypes } }
                : {}),
            ...(data.warehouseId
                ? {
                      OR: [
                          { fromWarehouseId: data.warehouseId },
                          { toWarehouseId: data.warehouseId },
                      ],
                  }
                : {}),
        };

        const movements = await prisma.stockMovement.findMany({
            where,
            orderBy: { createdAt: "asc" },
            include: {
                createdBy: { select: { email: true, name: true } },
                fromWarehouse: { select: { code: true, name: true } },
                inventoryTransaction: {
                    select: {
                        referenceType: true,
                        transactionNumber: true,
                        type: true,
                    },
                },
                toWarehouse: { select: { code: true, name: true } },
            },
        });

        const products = await prisma.product.findMany({
            where: {
                id: {
                    in: Array.from(
                        new Set(movements.map((movement) => movement.productId))
                    ),
                },
            },
            select: { id: true, name: true, sku: true },
        });

        const productMap = new Map(
            products.map((product) => [product.id, product] as const)
        );

        const rows = movements.map((movement) => {
            const product = productMap.get(movement.productId);
            return {
                batchNumber: movement.batchNumber ?? "—",
                date: movement.createdAt.toISOString(),
                destination: movement.toWarehouse
                    ? `${movement.toWarehouse.name} (${movement.toWarehouse.code})`
                    : "—",
                movementType: movement.type,
                performedBy:
                    movement.createdBy.name ?? movement.createdBy.email,
                product: product?.name ?? movement.productId,
                quantity: toNumber(movement.quantity),
                reference: movement.referenceNumber ?? "—",
                serialNumber: movement.serialNumber ?? "—",
                sku: product?.sku ?? "—",
                source: movement.fromWarehouse
                    ? `${movement.fromWarehouse.name} (${movement.fromWarehouse.code})`
                    : "—",
                transactionNumber:
                    movement.inventoryTransaction?.transactionNumber ?? "—",
            };
        });

        const byType = rows.reduce<Record<string, number>>((acc, row) => {
            acc[row.movementType] = (acc[row.movementType] ?? 0) + row.quantity;
            return acc;
        }, {});

        if (data.format === "json") {
            return {
                dateFrom: data.dateFrom,
                dateTo: data.dateTo,
                rows,
                summary: { byType, totalMovements: rows.length },
            };
        }

        const headers = [
            "Date",
            "Transaction #",
            "Type",
            "From",
            "To",
            "SKU",
            "Product",
            "Quantity",
            "Batch",
            "Serial",
            "Reference",
            "Performed By",
        ];

        const csvRows = rows.map((row) => [
            row.date,
            row.transactionNumber,
            row.movementType,
            row.source,
            row.destination,
            row.sku,
            row.product,
            row.quantity,
            row.batchNumber,
            row.serialNumber,
            row.reference,
            row.performedBy,
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
            filename: `movements-${Date.now()}.csv`,
            format: "csv",
            summary: { byType, totalMovements: rows.length },
        };
    });
