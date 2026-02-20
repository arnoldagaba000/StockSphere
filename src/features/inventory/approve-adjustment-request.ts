import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import {
    ADJUSTMENT_APPROVAL_APPROVED_ACTION,
    ADJUSTMENT_APPROVAL_REJECTED_ACTION,
    ADJUSTMENT_APPROVAL_REQUESTED_ACTION,
    INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
    parseAdjustmentApprovalRequestPayload,
} from "./adjustment-approval-request";
import { toNumber } from "./helpers";

const approveAdjustmentRequestSchema = z.object({
    approvalNotes: z.string().max(500).optional().nullable(),
    requestId: z.string().min(1),
});

export const approveAdjustmentRequest = createServerFn({ method: "POST" })
    .inputValidator(approveAdjustmentRequestSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.INVENTORY_ADJUST_APPROVE)
        ) {
            throw new Error(
                "You do not have permission to approve adjustment requests."
            );
        }

        const requestLog = await prisma.activityLog.findUnique({
            where: { id: data.requestId },
        });
        if (
            !requestLog ||
            requestLog.action !== ADJUSTMENT_APPROVAL_REQUESTED_ACTION ||
            requestLog.entity !== INVENTORY_ADJUSTMENT_REQUEST_ENTITY
        ) {
            throw new Error("Adjustment approval request not found.");
        }

        const existingResolution = await prisma.activityLog.findFirst({
            where: {
                action: {
                    in: [
                        ADJUSTMENT_APPROVAL_APPROVED_ACTION,
                        ADJUSTMENT_APPROVAL_REJECTED_ACTION,
                    ],
                },
                entity: INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
                entityId: data.requestId,
            },
            select: { id: true },
        });
        if (existingResolution) {
            throw new Error("This request has already been resolved.");
        }

        const payload = parseAdjustmentApprovalRequestPayload(
            requestLog.changes
        );
        if (!payload) {
            throw new Error("Invalid approval request payload.");
        }

        const stockItem = await prisma.stockItem.findUnique({
            where: { id: payload.stockItemId },
        });
        if (!stockItem) {
            throw new Error("Stock item for this request no longer exists.");
        }

        const currentQuantity = toNumber(stockItem.quantity);
        const difference = payload.countedQuantity - currentQuantity;
        const absoluteDifference = Math.abs(difference);
        const now = new Date();
        const adjustmentNumber = `ADJ-${now.getTime()}-${stockItem.id.slice(0, 6)}`;

        const adjustment = await prisma.$transaction(async (tx) => {
            await tx.stockItem.update({
                where: { id: stockItem.id },
                data: { quantity: payload.countedQuantity },
            });

            const createdAdjustment = await tx.inventoryAdjustment.create({
                data: {
                    adjustedQuantity: payload.countedQuantity,
                    adjustmentNumber,
                    batchNumber: stockItem.batchNumber,
                    createdById: requestLog.userId,
                    difference,
                    notes: payload.notes ?? data.approvalNotes ?? null,
                    previousQuantity: currentQuantity,
                    productId: stockItem.productId,
                    reason: payload.reason,
                    warehouseId: stockItem.warehouseId,
                },
            });

            if (absoluteDifference > 0) {
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
                            payload.notes ??
                            `Approved adjustment request: ${payload.reason}`,
                        referenceNumber: adjustmentNumber,
                        serialNumber: stockItem.serialNumber,
                        toWarehouseId:
                            difference > 0 ? stockItem.warehouseId : null,
                        type: "ADJUSTMENT",
                    },
                });
            }

            return createdAdjustment;
        });

        await logActivity({
            action: ADJUSTMENT_APPROVAL_APPROVED_ACTION,
            actorUserId: context.session.user.id,
            changes: {
                adjustmentId: adjustment.id,
                approvalNotes: data.approvalNotes ?? null,
                requestId: data.requestId,
            },
            entity: INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
            entityId: data.requestId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            adjustment: {
                ...adjustment,
                adjustedQuantity: toNumber(adjustment.adjustedQuantity),
                difference: toNumber(adjustment.difference),
                previousQuantity: toNumber(adjustment.previousQuantity),
            },
            requestId: data.requestId,
        };
    });
