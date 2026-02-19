import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { assertPositiveQuantity, toNumber } from "./helpers";

const transferStockSchema = z.object({
    notes: z.string().max(500).nullable().optional(),
    quantity: z.preprocess((value) => Number(value), z.number().positive()),
    stockItemId: z.string().min(1),
    toLocationId: z.string().nullable().optional(),
    toWarehouseId: z.string().min(1),
});

export const transferStock = createServerFn({ method: "POST" })
    .inputValidator(transferStockSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_TRANSFER_COMPLETE
            )
        ) {
            throw new Error("You do not have permission to transfer stock.");
        }

        assertPositiveQuantity(data.quantity, "Transfer quantity");

        const sourceStock = await prisma.stockItem.findUnique({
            where: { id: data.stockItemId },
        });
        if (!sourceStock) {
            throw new Error("Source stock item not found.");
        }

        const [toWarehouse, toLocation] = await Promise.all([
            prisma.warehouse.findFirst({
                where: { deletedAt: null, id: data.toWarehouseId },
            }),
            data.toLocationId
                ? prisma.location.findFirst({
                      where: {
                          deletedAt: null,
                          id: data.toLocationId,
                          warehouseId: data.toWarehouseId,
                      },
                  })
                : Promise.resolve(null),
        ]);
        if (!toWarehouse) {
            throw new Error("Destination warehouse not found.");
        }
        if (data.toLocationId && !toLocation) {
            throw new Error(
                "Destination location not found in target warehouse."
            );
        }

        const sourceAvailable =
            toNumber(sourceStock.quantity) -
            toNumber(sourceStock.reservedQuantity);
        if (data.quantity > sourceAvailable) {
            throw new Error("Transfer quantity exceeds available stock.");
        }

        const now = new Date();
        const movementNumber = `TRF-${now.getTime()}-${sourceStock.id.slice(0, 6)}`;

        const result = await prisma.$transaction(async (tx) => {
            const updatedSource = await tx.stockItem.update({
                where: { id: sourceStock.id },
                data: {
                    quantity: toNumber(sourceStock.quantity) - data.quantity,
                },
            });

            const existingDestination = await tx.stockItem.findFirst({
                where: {
                    batchNumber: sourceStock.batchNumber,
                    locationId: data.toLocationId ?? null,
                    productId: sourceStock.productId,
                    serialNumber: sourceStock.serialNumber,
                    warehouseId: data.toWarehouseId,
                },
            });

            const destination = existingDestination
                ? await tx.stockItem.update({
                      where: { id: existingDestination.id },
                      data: {
                          quantity: { increment: data.quantity },
                      },
                  })
                : await tx.stockItem.create({
                      data: {
                          batchNumber: sourceStock.batchNumber,
                          expiryDate: sourceStock.expiryDate,
                          locationId: data.toLocationId ?? null,
                          productId: sourceStock.productId,
                          quantity: data.quantity,
                          reservedQuantity: 0,
                          serialNumber: sourceStock.serialNumber,
                          status: sourceStock.status,
                          unitCost: sourceStock.unitCost,
                          warehouseId: data.toWarehouseId,
                      },
                  });

            const transaction = await tx.inventoryTransaction.create({
                data: {
                    createdById: context.session.user.id,
                    notes: data.notes ?? "Stock transfer",
                    referenceType: "StockTransfer",
                    transactionNumber: movementNumber,
                    type: "TRANSFER",
                },
            });

            await tx.stockMovement.create({
                data: {
                    batchNumber: sourceStock.batchNumber,
                    createdById: context.session.user.id,
                    fromWarehouseId: sourceStock.warehouseId,
                    inventoryTransactionId: transaction.id,
                    movementNumber,
                    productId: sourceStock.productId,
                    quantity: data.quantity,
                    reason: data.notes ?? "Stock transfer",
                    referenceNumber: transaction.transactionNumber,
                    serialNumber: sourceStock.serialNumber,
                    toWarehouseId: data.toWarehouseId,
                    type: "TRANSFER",
                },
            });

            return { destination, updatedSource };
        });

        await logActivity({
            action: "STOCK_TRANSFERRED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    destinationStockItemId: result.destination.id,
                    movedQuantity: data.quantity,
                    sourceStockItemId: result.updatedSource.id,
                },
            },
            entity: "StockMovement",
            entityId: movementNumber,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            destination: {
                ...result.destination,
                quantity: toNumber(result.destination.quantity),
                reservedQuantity: toNumber(result.destination.reservedQuantity),
            },
            source: {
                ...result.updatedSource,
                quantity: toNumber(result.updatedSource.quantity),
                reservedQuantity: toNumber(
                    result.updatedSource.reservedQuantity
                ),
            },
        };
    });
