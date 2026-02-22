import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import {
    generateInventoryTransactionNumber,
    generateStockMovementNumber,
} from "@/features/purchases/purchase-helpers";
import { getNumberingPrefixes } from "@/features/settings/get-numbering-prefixes";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { manualStockEntrySchema } from "@/schemas/stock-item-schema";
import { validateRequiredTrackingFields } from "./tracking-validation";

export const createInitialStock = createServerFn({ method: "POST" })
    .inputValidator(manualStockEntrySchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_INITIAL_STOCK_ENTRY
            )
        ) {
            throw new Error(
                "You do not have permission to create initial stock entries."
            );
        }

        const [product, warehouse] = await Promise.all([
            prisma.product.findFirst({
                where: { deletedAt: null, id: data.productId },
            }),
            prisma.warehouse.findFirst({
                where: { deletedAt: null, id: data.warehouseId },
            }),
        ]);
        if (!product) {
            throw new Error("Product not found.");
        }
        if (!warehouse) {
            throw new Error("Warehouse not found.");
        }

        if (data.locationId) {
            const location = await prisma.location.findFirst({
                where: {
                    deletedAt: null,
                    id: data.locationId,
                    warehouseId: data.warehouseId,
                },
            });
            if (!location) {
                throw new Error(
                    "Location not found in the selected warehouse."
                );
            }
        }

        const duplicateSerial = data.serialNumber
            ? await prisma.stockItem.findFirst({
                  where: {
                      serialNumber: data.serialNumber,
                  },
                  select: { id: true },
              })
            : null;
        if (duplicateSerial) {
            throw new Error("Serial number already exists in stock.");
        }

        validateRequiredTrackingFields(
            {
                trackByBatch: product.trackByBatch,
                trackByExpiry: product.trackByExpiry,
                trackBySerialNumber: product.trackBySerialNumber,
            },
            {
                batchNumber: data.batchNumber,
                expiryDate: data.expiryDate,
                serialNumber: data.serialNumber,
            }
        );

        const numberingPrefixes = await getNumberingPrefixes();

        const stockItem = await prisma.$transaction(async (tx) => {
            const transactionNumber = generateInventoryTransactionNumber(
                numberingPrefixes.inventoryTransaction
            );
            const createdStockItem = await tx.stockItem.create({
                data: {
                    batchNumber: data.batchNumber ?? null,
                    expiryDate: data.expiryDate ?? null,
                    locationId: data.locationId ?? null,
                    productId: data.productId,
                    quantity: data.quantity,
                    reservedQuantity: 0,
                    serialNumber: data.serialNumber ?? null,
                    status: "AVAILABLE",
                    unitCost: data.unitCost ?? null,
                    warehouseId: data.warehouseId,
                },
            });

            await tx.stockMovement.create({
                data: {
                    batchNumber: data.batchNumber ?? null,
                    createdById: context.session.user.id,
                    fromWarehouseId: null,
                    movementNumber: generateStockMovementNumber(
                        numberingPrefixes.stockMovement,
                        transactionNumber,
                        1
                    ),
                    productId: data.productId,
                    quantity: data.quantity,
                    reason: data.notes ?? "Initial stock entry",
                    referenceNumber: "INITIAL_STOCK",
                    serialNumber: data.serialNumber ?? null,
                    toWarehouseId: data.warehouseId,
                    type: "ADJUSTMENT",
                },
            });

            return createdStockItem;
        });

        await logActivity({
            action: "INVENTORY_INITIAL_STOCK_CREATED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    ...stockItem,
                    quantity: String(stockItem.quantity),
                    reservedQuantity: String(stockItem.reservedQuantity),
                },
            },
            entity: "StockItem",
            entityId: stockItem.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            ...stockItem,
            quantity: Number(stockItem.quantity),
            reservedQuantity: Number(stockItem.reservedQuantity),
        };
    });
