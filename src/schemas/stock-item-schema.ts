import { z } from "zod";

export const manualStockEntrySchema = z.object({
    productId: z.string().min(1, "Product is required"),
    warehouseId: z.string().min(1, "Warehouse is required"),
    locationId: z.string().optional().nullable(),

    quantity: z.preprocess(
        (value) => (value === "" ? undefined : Number(value)),
        z
            .number()
            .finite("Quantity is required")
            .positive("Quantity must be greater than zero")
    ),

    // Stored as whole integer minor units (no decimals).
    unitCost: z.preprocess((value) => {
        if (value === "" || value === null || value === undefined) {
            return null;
        }
        return Number(value);
    }, z
        .number()
        .int("Unit cost must be a whole number in minor units")
        .min(0, "Unit cost cannot be negative")
        .nullable()),

    // These are only required if the product's tracking flags demand them.
    // The server function will check the product's flags and validate accordingly.
    batchNumber: z.string().max(100).optional().nullable(),
    serialNumber: z.string().max(100).optional().nullable(),
    expiryDate: z.preprocess((value) => {
        if (!value) {
            return null;
        }
        if (value instanceof Date) {
            return value;
        }
        const parsedDate = new Date(String(value));
        return Number.isNaN(parsedDate.getTime()) ? undefined : parsedDate;
    }, z.date().nullable().optional()),

    notes: z.string().max(500).optional().nullable(),
});

export type ManualStockEntryData = z.infer<typeof manualStockEntrySchema>;
