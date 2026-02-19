import { z } from "zod";

export const warehouseSchema = z.object({
    // A short, unique code like "WH-KLA-01" makes warehouses easy to reference in reports
    // and on printed documents without spelling out the full name.
    code: z
        .string()
        .min(1, "Warehouse code is required")
        .max(20, "Code must be 20 characters or less")
        .regex(
            /^[A-Z0-9-]+$/,
            "Code must be uppercase letters, numbers, and hyphens only"
        ),

    name: z.string().min(1, "Warehouse name is required").max(100),

    address: z.string().max(500).optional().nullable(),
    district: z.string().max(100).optional().nullable(),
    postalCode: z.string().max(30).optional().nullable(),
    country: z.string().max(100).default("Uganda"),

    isActive: z.boolean().default(true),
});

export type WarehouseFormData = z.infer<typeof warehouseSchema>;
