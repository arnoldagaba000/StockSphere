import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getKitGenealogySchema = z.object({
    batchNumber: z.string().trim().optional(),
    kitId: z.string().min(1),
    limit: z.number().int().min(1).max(200).default(50),
    warehouseId: z.string().optional(),
});

export const getKitGenealogy = createServerFn({ method: "GET" })
    .inputValidator(getKitGenealogySchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !(
                canUser(
                    context.session.user,
                    PERMISSIONS.BATCHES_GENEALOGY_VIEW
                ) ||
                canUser(context.session.user, PERMISSIONS.KITS_VIEW_BOM_DETAIL)
            )
        ) {
            throw new Error(
                "You do not have permission to view kit genealogy."
            );
        }

        const kitOutputMovements = await prisma.stockMovement.findMany({
            where: {
                productId: data.kitId,
                type: "ASSEMBLY",
                ...(data.batchNumber ? { batchNumber: data.batchNumber } : {}),
                ...(data.warehouseId
                    ? { toWarehouseId: data.warehouseId }
                    : {}),
                inventoryTransaction: {
                    type: "ASSEMBLY",
                },
            },
            include: {
                inventoryTransaction: {
                    include: {
                        movements: true,
                    },
                },
                toWarehouse: { select: { code: true, name: true } },
            },
            orderBy: { createdAt: "desc" },
            take: data.limit,
        });

        const productIds = Array.from(
            new Set(
                kitOutputMovements.flatMap(
                    (movement) =>
                        movement.inventoryTransaction?.movements.map(
                            (item) => item.productId
                        ) ?? []
                )
            )
        );
        const products = await prisma.product.findMany({
            where: { id: { in: productIds } },
            select: { id: true, name: true, sku: true, unit: true },
        });
        const productMap = new Map(
            products.map((product) => [product.id, product])
        );

        return kitOutputMovements.map((movement) => {
            const transactionMovements =
                movement.inventoryTransaction?.movements ?? [];
            const consumedComponents = transactionMovements
                .filter(
                    (item) =>
                        item.productId !== data.kitId &&
                        item.fromWarehouseId !== null
                )
                .map((item) => {
                    const product = productMap.get(item.productId);
                    return {
                        batchNumber: item.batchNumber,
                        componentId: item.productId,
                        componentName: product?.name ?? item.productId,
                        componentSku: product?.sku ?? "—",
                        componentUnit: product?.unit ?? "pcs",
                        quantity: toNumber(item.quantity),
                        serialNumber: item.serialNumber,
                    };
                });

            return {
                assembledAt: movement.createdAt,
                assembledBatchNumber: movement.batchNumber,
                assembledQuantity: toNumber(movement.quantity),
                assembledSerialNumber: movement.serialNumber,
                consumedComponents,
                transactionNumber:
                    movement.inventoryTransaction?.transactionNumber ??
                    movement.referenceNumber,
                warehouse:
                    movement.toWarehouse?.name ??
                    movement.toWarehouseId ??
                    "Unknown warehouse",
            };
        });
    });
