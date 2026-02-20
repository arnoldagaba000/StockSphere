import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

const MOVEMENT_TYPES = [
    "PURCHASE_RECEIPT",
    "SALES_SHIPMENT",
    "TRANSFER",
    "ADJUSTMENT",
    "RETURN",
    "ASSEMBLY",
    "DISASSEMBLY",
] as const;

const movementHistorySchema = z.object({
    dateFrom: z.coerce.date().optional(),
    dateTo: z.coerce.date().optional(),
    movementType: z.enum(MOVEMENT_TYPES).optional(),
    page: z
        .preprocess((value) => Number(value ?? 1), z.number().int().min(1))
        .optional(),
    pageSize: z
        .preprocess(
            (value) => Number(value ?? 50),
            z.number().int().min(1).max(200)
        )
        .optional(),
    productId: z.string().min(1).optional(),
    warehouseId: z.string().min(1).optional(),
});

export const getMovementHistory = createServerFn({ method: "GET" })
    .inputValidator(movementHistorySchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_HISTORY_MOVEMENT_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to view stock movement history."
            );
        }

        const page = data.page ?? 1;
        const pageSize = data.pageSize ?? 50;

        const where = {
            ...(data.productId ? { productId: data.productId } : {}),
            ...(data.warehouseId
                ? {
                      OR: [
                          { fromWarehouseId: data.warehouseId },
                          { toWarehouseId: data.warehouseId },
                      ],
                  }
                : {}),
            ...(data.movementType ? { type: data.movementType } : {}),
            ...(data.dateFrom || data.dateTo
                ? {
                      createdAt: {
                          ...(data.dateFrom ? { gte: data.dateFrom } : {}),
                          ...(data.dateTo ? { lte: data.dateTo } : {}),
                      },
                  }
                : {}),
        };

        const [total, movements] = await Promise.all([
            prisma.stockMovement.count({ where }),
            prisma.stockMovement.findMany({
                where,
                include: {
                    createdBy: { select: { email: true, name: true } },
                    fromWarehouse: { select: { code: true, name: true } },
                    inventoryTransaction: {
                        select: {
                            id: true,
                            referenceId: true,
                            referenceType: true,
                            transactionNumber: true,
                            type: true,
                        },
                    },
                    toWarehouse: { select: { code: true, name: true } },
                },
                orderBy: { createdAt: "desc" },
                skip: (page - 1) * pageSize,
                take: pageSize,
            }),
        ]);

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

        return {
            movements: movements.map((movement) => ({
                ...movement,
                product: productMap.get(movement.productId) ?? null,
                quantity: toNumber(movement.quantity),
            })),
            page,
            pageSize,
            total,
        };
    });
