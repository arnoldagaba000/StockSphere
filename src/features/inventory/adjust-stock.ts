import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { inventoryAdjustmentSchema } from "@/schemas/adjustment-schema";
import {
    ADJUSTMENT_APPROVAL_REQUESTED_ACTION,
    INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
} from "./adjustment-approval-request";
import { toNumber } from "./helpers";

const parseApprovalThreshold = (): number => {
    const value = Number(
        process.env.INVENTORY_ADJUSTMENT_APPROVAL_THRESHOLD ?? "0"
    );
    return Number.isFinite(value) && value >= 0 ? value : 0;
};

export const adjustStock = createServerFn({ method: "POST" })
    .inputValidator(inventoryAdjustmentSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const stockItem = await prisma.stockItem.findUnique({
            where: { id: data.stockItemId },
        });
        if (!stockItem) {
            throw new Error("Stock item not found.");
        }

        const currentQuantity = toNumber(stockItem.quantity);
        const difference = data.countedQuantity - currentQuantity;
        const absoluteDifference = Math.abs(difference);
        if (absoluteDifference === 0) {
            return {
                adjustment: null,
                message: "No adjustment required.",
                stockItem: {
                    ...stockItem,
                    quantity: currentQuantity,
                    reservedQuantity: toNumber(stockItem.reservedQuantity),
                },
            };
        }

        const threshold = parseApprovalThreshold();
        const requiresLargeAdjustmentPermission =
            absoluteDifference > threshold;
        if (requiresLargeAdjustmentPermission) {
            const canRequestLargeAdjustment = canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_ADJUST_LARGE
            );
            if (!canRequestLargeAdjustment) {
                throw new Error(
                    "This adjustment exceeds the configured threshold for your role."
                );
            }

            const canApproveLargeAdjustment = canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_ADJUST_APPROVE
            );
            if (!canApproveLargeAdjustment) {
                await logActivity({
                    action: ADJUSTMENT_APPROVAL_REQUESTED_ACTION,
                    actorUserId: context.session.user.id,
                    changes: {
                        countedQuantity: data.countedQuantity,
                        notes: data.notes ?? null,
                        reason: data.reason,
                        requestedDifference: difference,
                        requestedPreviousQuantity: currentQuantity,
                        stockItemId: stockItem.id,
                    },
                    entity: INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
                    entityId: `ADJREQ-${Date.now()}-${stockItem.id.slice(0, 6)}`,
                    ipAddress: getRequestIpAddress(getRequestHeaders()),
                });

                return {
                    adjustment: null,
                    message:
                        "Large adjustment submitted for approval. A manager must approve before stock is updated.",
                    requiresApproval: true,
                    stockItem: {
                        ...stockItem,
                        quantity: currentQuantity,
                        reservedQuantity: toNumber(stockItem.reservedQuantity),
                    },
                };
            }
        } else if (
            !canUser(context.session.user, PERMISSIONS.INVENTORY_ADJUST_SMALL)
        ) {
            throw new Error("You do not have permission to adjust stock.");
        }

        const now = new Date();
        const adjustmentNumber = `ADJ-${now.getTime()}-${stockItem.id.slice(0, 6)}`;

        const result = await prisma.$transaction(async (tx) => {
            const updatedStockItem = await tx.stockItem.update({
                where: { id: stockItem.id },
                data: { quantity: data.countedQuantity },
            });

            const adjustment = await tx.inventoryAdjustment.create({
                data: {
                    adjustedQuantity: data.countedQuantity,
                    adjustmentNumber,
                    batchNumber: stockItem.batchNumber,
                    createdById: context.session.user.id,
                    difference,
                    notes: data.notes ?? null,
                    previousQuantity: currentQuantity,
                    productId: stockItem.productId,
                    reason: data.reason,
                    warehouseId: stockItem.warehouseId,
                },
            });

            await tx.stockMovement.create({
                data: {
                    batchNumber: stockItem.batchNumber,
                    createdById: context.session.user.id,
                    fromWarehouseId:
                        difference < 0 ? stockItem.warehouseId : null,
                    movementNumber: adjustmentNumber,
                    productId: stockItem.productId,
                    quantity: absoluteDifference,
                    reason:
                        data.notes ?? `Inventory adjustment: ${data.reason}`,
                    referenceNumber: adjustmentNumber,
                    serialNumber: stockItem.serialNumber,
                    toWarehouseId:
                        difference > 0 ? stockItem.warehouseId : null,
                    type: "ADJUSTMENT",
                },
            });

            return { adjustment, updatedStockItem };
        });

        await logActivity({
            action: "STOCK_ADJUSTED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    adjustedQuantity: data.countedQuantity,
                    difference,
                    reason: data.reason,
                    stockItemId: stockItem.id,
                },
                before: {
                    quantity: currentQuantity,
                },
            },
            entity: "InventoryAdjustment",
            entityId: result.adjustment.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            adjustment: {
                ...result.adjustment,
                adjustedQuantity: toNumber(result.adjustment.adjustedQuantity),
                difference: toNumber(result.adjustment.difference),
                previousQuantity: toNumber(result.adjustment.previousQuantity),
            },
            message: "Stock adjusted.",
            stockItem: {
                ...result.updatedStockItem,
                quantity: toNumber(result.updatedStockItem.quantity),
                reservedQuantity: toNumber(
                    result.updatedStockItem.reservedQuantity
                ),
            },
        };
    });
