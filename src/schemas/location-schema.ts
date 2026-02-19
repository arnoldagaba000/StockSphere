import { z } from "zod";

// These location types map directly to your Prisma enum.
// The type controls what operations are permitted here:
// - STANDARD: normal sellable stock
// - QUARANTINE: held for inspection, not available for sales orders
// - DAMAGED: written-off stock, excluded from valuation
// - RETURNS: customer returns awaiting processing
// - STAGING: temporary holding area during receiving or shipping
const locationTypes = [
    "STANDARD",
    "QUARANTINE",
    "DAMAGED",
    "RETURNS",
    "STAGING",
] as const;

export const locationSchema = z.object({
    // Location codes like "A-01-03" (Aisle A, Shelf 1, Bin 3) are standard
    // in warehousing. They let workers navigate by reading the code on a pick list.
    code: z
        .string()
        .min(1, "Location code is required")
        .max(20)
        .regex(
            /^[A-Z0-9-]+$/,
            "Code must be uppercase letters, numbers, and hyphens only"
        ),

    name: z.string().min(1, "Location name is required").max(100),

    warehouseId: z.string().min(1, "Warehouse is required"),

    type: z.enum(locationTypes).default("STANDARD"),

    isActive: z.boolean().default(true),
});

export type LocationFormData = z.infer<typeof locationSchema>;
