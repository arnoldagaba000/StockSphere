import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

const quarantineStockSchema = z.object({
    quarantineLocationId: z.string().optional().nullable(),
    reason: z.string().min(1, "Quarantine reason is required"),
    stockItemId: z.string().min(1),
});

export const moveToQuarantine = createServerFn({ method: "POST" })
    .inputValidator(quarantineStockSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_QUARANTINE_MOVE
            )
        ) {
            throw new Error("You do not have permission to quarantine stock.");
        }

        const stockItem = await prisma.stockItem.findUnique({
            where: { id: data.stockItemId },
            include: { product: true, warehouse: true },
        });
        if (!stockItem) {
            throw new Error("Stock item not found.");
        }
        if (stockItem.status !== "AVAILABLE") {
            throw new Error(
                `Stock is already in "${stockItem.status}" status.`
            );
        }

        const reservedQuantity = toNumber(stockItem.reservedQuantity);
        if (reservedQuantity > 0) {
            throw new Error(
                `Cannot quarantine stock with active reservations (${reservedQuantity} units reserved).`
            );
        }

        if (data.quarantineLocationId) {
            const quarantineLocation = await prisma.location.findFirst({
                where: {
                    deletedAt: null,
                    id: data.quarantineLocationId,
                    isActive: true,
                    warehouseId: stockItem.warehouseId,
                },
            });
            if (!quarantineLocation) {
                throw new Error(
                    "Quarantine location not found in the stock item's warehouse."
                );
            }
        }

        const result = await prisma.$transaction(async (tx) => {
            const updatedStockItem = await tx.stockItem.update({
                where: { id: data.stockItemId },
                data: {
                    locationId:
                        data.quarantineLocationId ?? stockItem.locationId,
                    status: "QUARANTINE",
                },
            });

            const movementNumber = `QTN-${Date.now()}-${stockItem.id.slice(0, 6)}`;

            await tx.stockMovement.create({
                data: {
                    batchNumber: stockItem.batchNumber,
                    createdById: context.session.user.id,
                    fromWarehouseId: stockItem.warehouseId,
                    movementNumber,
                    productId: stockItem.productId,
                    quantity: toNumber(stockItem.quantity),
                    reason: `Quarantine: ${data.reason}`,
                    referenceNumber: movementNumber,
                    serialNumber: stockItem.serialNumber,
                    toWarehouseId: stockItem.warehouseId,
                    type: "ADJUSTMENT",
                },
            });

            return { movementNumber, updatedStockItem };
        });

        await logActivity({
            action: "STOCK_QUARANTINED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    locationId: result.updatedStockItem.locationId,
                    status: "QUARANTINE",
                },
                before: {
                    locationId: stockItem.locationId,
                    status: stockItem.status,
                },
                reason: data.reason,
            },
            entity: "StockItem",
            entityId: stockItem.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            movementNumber: result.movementNumber,
            stockItem: {
                ...result.updatedStockItem,
                quantity: toNumber(result.updatedStockItem.quantity),
                reservedQuantity: toNumber(
                    result.updatedStockItem.reservedQuantity
                ),
            },
        };
    });
