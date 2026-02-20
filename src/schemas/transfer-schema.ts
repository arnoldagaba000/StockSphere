import { z } from "zod";

export const stockTransferSchema = z.object({
    notes: z.string().max(500).nullable().optional(),
    quantity: z.preprocess((value) => Number(value), z.number().positive()),
    stockItemId: z.string().min(1),
    toLocationId: z.string().nullable().optional(),
    toWarehouseId: z.string().min(1),
});

export type StockTransferInput = z.infer<typeof stockTransferSchema>;
