import { z } from "zod";

const quantitySchema = z.number().positive();

export const setKitBomSchema = z.object({
    components: z
        .array(
            z.object({
                componentId: z.string().min(1),
                quantity: quantitySchema,
            })
        )
        .min(1),
    kitId: z.string().min(1),
});

export const assembleKitSchema = z.object({
    kitBatchNumber: z.string().trim().optional(),
    kitExpiryDate: z.coerce.date().optional(),
    kitId: z.string().min(1),
    kitLocationId: z.string().optional(),
    kitSerialNumber: z.string().trim().optional(),
    notes: z.string().trim().optional(),
    quantity: quantitySchema,
    warehouseId: z.string().min(1),
});

export const disassembleKitSchema = z.object({
    kitStockItemId: z.string().min(1),
    notes: z.string().trim().optional(),
    quantity: quantitySchema,
});
