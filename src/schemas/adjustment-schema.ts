import { z } from "zod";

export const adjustmentReasons = [
    "PHYSICAL_COUNT",
    "DAMAGE",
    "LOSS",
    "FOUND",
    "EXPIRY",
    "QUALITY_ISSUE",
    "OTHER",
] as const;

export const inventoryAdjustmentSchema = z.object({
    countedQuantity: z.preprocess((value) => Number(value), z.number().min(0)),
    notes: z.string().max(500).nullable().optional(),
    reason: z.enum(adjustmentReasons),
    stockItemId: z.string().min(1),
});

export type InventoryAdjustmentInput = z.infer<
    typeof inventoryAdjustmentSchema
>;
