import { z } from "zod";

export const INVENTORY_ADJUSTMENT_REQUEST_ENTITY = "InventoryAdjustmentRequest";
export const ADJUSTMENT_APPROVAL_REQUESTED_ACTION =
    "ADJUSTMENT_APPROVAL_REQUESTED";
export const ADJUSTMENT_APPROVAL_APPROVED_ACTION =
    "ADJUSTMENT_APPROVAL_APPROVED";
export const ADJUSTMENT_APPROVAL_REJECTED_ACTION =
    "ADJUSTMENT_APPROVAL_REJECTED";

export const adjustmentApprovalRequestPayloadSchema = z.object({
    countedQuantity: z.number(),
    notes: z.string().max(1000).nullable(),
    reason: z.enum([
        "PHYSICAL_COUNT",
        "DAMAGE",
        "LOSS",
        "FOUND",
        "EXPIRY",
        "QUALITY_ISSUE",
        "OTHER",
    ]),
    requestedDifference: z.number(),
    requestedPreviousQuantity: z.number(),
    stockItemId: z.string().min(1),
});

export type AdjustmentApprovalRequestPayload = z.infer<
    typeof adjustmentApprovalRequestPayloadSchema
>;

export const parseAdjustmentApprovalRequestPayload = (
    changes: unknown
): AdjustmentApprovalRequestPayload | null => {
    const result = adjustmentApprovalRequestPayloadSchema.safeParse(changes);
    if (!result.success) {
        return null;
    }

    return result.data;
};
