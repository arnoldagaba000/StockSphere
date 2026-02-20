import { z } from "zod";

const RESERVED_SKU_PREFIXES = ["SYS-", "ROOT-", "ADMIN-"] as const;
const PRODUCT_STATUSES = [
    "ACTIVE",
    "ARCHIVED",
    "DISCONTINUED",
    "DRAFT",
] as const;

const toNullableTrimmedString = (value: unknown): string | null | undefined => {
    if (value === null || value === undefined) {
        return value as null | undefined;
    }

    if (typeof value !== "string") {
        return value as string;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? null : trimmedValue;
};

const toNullableNumber = (value: unknown): number | null | undefined => {
    if (value === null || value === undefined) {
        return value as null | undefined;
    }

    if (value === "") {
        return null;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : Number.NaN;
    }

    if (typeof value === "string") {
        const parsedValue = Number(value);
        return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
    }

    return Number.NaN;
};

const productSchemaBase = z.object({
    sku: z
        .string()
        .trim()
        .min(1, "SKU is required")
        .max(50, "SKU must be 50 characters or less")
        .regex(/^[A-Za-z0-9._/-]+$/, "SKU contains invalid characters")
        .refine(
            (value) =>
                !RESERVED_SKU_PREFIXES.some((prefix) =>
                    value.toUpperCase().startsWith(prefix)
                ),
            "SKU uses a reserved prefix"
        )
        .transform((value) => value.toUpperCase()),

    barcode: z.preprocess(
        toNullableTrimmedString,
        z
            .string()
            .max(50)
            .regex(/^[A-Za-z0-9-]+$/, "Barcode contains invalid characters")
            .nullable()
            .optional()
    ),

    name: z.string().trim().min(1, "Product name is required").max(200),

    description: z.preprocess(
        toNullableTrimmedString,
        z.string().max(1000).nullable().optional()
    ),

    categoryId: z.preprocess(
        toNullableTrimmedString,
        z.string().cuid().nullable().optional()
    ),

    costPrice: z.preprocess(
        toNullableNumber,
        z.number().min(0, "Cost price cannot be negative").nullable().optional()
    ),
    sellingPrice: z.preprocess(
        toNullableNumber,
        z
            .number()
            .min(0, "Selling price cannot be negative")
            .nullable()
            .optional()
    ),

    taxRate: z.preprocess(
        toNullableNumber,
        z
            .number()
            .int("Tax rate must be a whole number")
            .min(0)
            .max(100)
            .nullable()
            .optional()
    ),

    reorderPoint: z.preprocess(
        toNullableNumber,
        z.number().int().min(0).nullable().optional()
    ),
    reorderQuantity: z.preprocess(
        toNullableNumber,
        z.number().int().min(0).nullable().optional()
    ),
    minimumStock: z.preprocess(
        toNullableNumber,
        z.number().int().min(0).nullable().optional()
    ),
    maximumStock: z.preprocess(
        toNullableNumber,
        z.number().int().min(0).nullable().optional()
    ),

    unit: z.string().trim().min(1).max(20).default("pcs"),
    weight: z.preprocess(
        toNullableNumber,
        z.number().min(0).nullable().optional()
    ),
    weightUnit: z.preprocess(
        toNullableTrimmedString,
        z.string().max(20).nullable().optional()
    ),
    dimensions: z.preprocess(
        toNullableTrimmedString,
        z.string().max(100).nullable().optional()
    ),

    trackBySerialNumber: z.boolean().default(false),
    trackByBatch: z.boolean().default(false),
    trackByExpiry: z.boolean().default(false),
    isKit: z.boolean().default(false),
    status: z.enum(PRODUCT_STATUSES).default("ACTIVE"),
});

export const productSchema = productSchemaBase
    .refine(
        (data) => {
            if (data.costPrice != null && data.sellingPrice != null) {
                return data.sellingPrice >= data.costPrice;
            }
            return true;
        },
        {
            message: "Selling price should not be lower than cost price",
            path: ["sellingPrice"],
        }
    )
    .refine(
        (data) => {
            if (data.minimumStock != null && data.maximumStock != null) {
                return data.maximumStock > data.minimumStock;
            }
            return true;
        },
        {
            message: "Maximum stock must be greater than minimum stock",
            path: ["maximumStock"],
        }
    );

export type ProductFormData = z.infer<typeof productSchema>;

export const updateProductSchema = productSchemaBase
    .partial()
    .extend({
        id: z.string().cuid("Invalid product id"),
    })
    .refine(
        (data) => {
            if (data.costPrice != null && data.sellingPrice != null) {
                return data.sellingPrice >= data.costPrice;
            }
            return true;
        },
        {
            message: "Selling price should not be lower than cost price",
            path: ["sellingPrice"],
        }
    )
    .refine(
        (data) => {
            if (data.minimumStock != null && data.maximumStock != null) {
                return data.maximumStock > data.minimumStock;
            }
            return true;
        },
        {
            message: "Maximum stock must be greater than minimum stock",
            path: ["maximumStock"],
        }
    );

export type UpdateProductFormData = z.infer<typeof updateProductSchema>;
