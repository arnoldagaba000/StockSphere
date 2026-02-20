import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

const rejectAdjustmentSchema = z.object({
    adjustmentId: z.string().min(1),
    rejectionReason: z.string().min(3).max(500),
});

export const rejectAdjustment = createServerFn({ method: "POST" })
    .inputValidator(rejectAdjustmentSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.INVENTORY_ADJUST_REJECT)
        ) {
            throw new Error(
                "You do not have permission to reject adjustments."
            );
        }

        const adjustment = await prisma.inventoryAdjustment.findUnique({
            where: { id: data.adjustmentId },
        });
        if (!adjustment) {
            throw new Error("Adjustment not found.");
        }

        await prisma.activityLog.create({
            data: {
                action: "REJECT_ADJUSTMENT",
                changes: {
                    adjustmentId: adjustment.id,
                    adjustmentNumber: adjustment.adjustmentNumber,
                    difference: toNumber(adjustment.difference),
                    rejectedAt: new Date().toISOString(),
                    rejectionReason: data.rejectionReason,
                },
                entity: "InventoryAdjustment",
                entityId: adjustment.id,
                userId: context.session.user.id,
            },
        });

        return {
            adjustmentId: adjustment.id,
            rejectionReason: data.rejectionReason,
            rejectedByUserId: context.session.user.id,
        };
    });
