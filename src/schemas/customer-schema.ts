import { z } from "zod";

const optionalTrimmedString = (max: number) =>
    z.string().trim().max(max).optional().nullable();

export const customerSchema = z.object({
    code: z
        .string()
        .trim()
        .min(1, "Customer code is required")
        .max(20)
        .regex(
            /^[A-Z0-9-]+$/,
            "Code must contain uppercase letters, numbers, or hyphens"
        ),
    name: z.string().trim().min(1, "Customer name is required").max(200),
    email: z
        .string()
        .trim()
        .email("Invalid email address")
        .optional()
        .nullable(),
    phone: optionalTrimmedString(50),
    address: optionalTrimmedString(500),
    city: optionalTrimmedString(100),
    country: optionalTrimmedString(100),
    paymentTerms: optionalTrimmedString(50),
    creditLimit: z
        .preprocess((value) => {
            if (value === "" || value === null || value === undefined) {
                return null;
            }
            return Number(value);
        }, z.number().int().min(0).nullable())
        .optional()
        .default(null),
    taxId: optionalTrimmedString(100),
    isActive: z.boolean().default(true),
});

export type CustomerFormData = z.infer<typeof customerSchema>;
