import { z } from "zod";

export const supplierSchema = z.object({
    code: z
        .string()
        .min(1, "Supplier code is required")
        .max(20)
        .regex(
            /^[A-Z0-9-]+$/,
            "Code must be uppercase letters, numbers, and hyphens only"
        ),

    name: z.string().min(1, "Supplier name is required").max(200),

    contactPerson: z.string().max(100).optional().nullable(),
    email: z.string().email("Invalid email address").optional().nullable(),
    phone: z.string().max(50).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    city: z.string().max(100).optional().nullable(),
    country: z.string().max(100).optional().nullable(),
    isActive: z.boolean().default(true),
    paymentTerms: z.string().max(100).optional().nullable(),
    taxId: z.string().max(100).optional().nullable(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;
