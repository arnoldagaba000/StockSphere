import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

const approveAdjustmentSchema = z.object({
    adjustmentId: z.string().min(1),
    approvalNotes: z.string().max(500).optional().nullable(),
});

export const approveAdjustment = createServerFn({ method: "POST" })
    .inputValidator(approveAdjustmentSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.INVENTORY_ADJUST_APPROVE)
        ) {
            throw new Error(
                "You do not have permission to approve adjustments."
            );
        }

        const adjustment = await prisma.inventoryAdjustment.findUnique({
            where: { id: data.adjustmentId },
            include: {
                product: { select: { name: true, sku: true } },
                warehouse: { select: { code: true, name: true } },
            },
        });
        if (!adjustment) {
            throw new Error("Adjustment not found.");
        }

        await prisma.activityLog.create({
            data: {
                action: "APPROVE_ADJUSTMENT",
                changes: {
                    adjustmentId: adjustment.id,
                    adjustmentNumber: adjustment.adjustmentNumber,
                    approvalNotes: data.approvalNotes ?? null,
                    approvedAt: new Date().toISOString(),
                    difference: toNumber(adjustment.difference),
                },
                entity: "InventoryAdjustment",
                entityId: adjustment.id,
                userId: context.session.user.id,
            },
        });

        return {
            adjustment: {
                ...adjustment,
                adjustedQuantity: toNumber(adjustment.adjustedQuantity),
                difference: toNumber(adjustment.difference),
                previousQuantity: toNumber(adjustment.previousQuantity),
            },
            approvalNotes: data.approvalNotes ?? null,
            approvedByUserId: context.session.user.id,
        };
    });
