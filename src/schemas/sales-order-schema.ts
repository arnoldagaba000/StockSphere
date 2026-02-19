import { z } from "zod";

const salesOrderItemSchema = z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.preprocess(
        (value) => Number(value),
        z.number().positive("Quantity must be greater than zero")
    ),
    unitPrice: z.preprocess(
        (value) => Number(value),
        z.number().int().min(0, "Unit price must be zero or greater")
    ),
    taxRate: z.preprocess(
        (value) => Number(value),
        z.number().int().min(0).max(100)
    ),
    discountPercent: z
        .preprocess((value) => {
            if (value === "" || value === null || value === undefined) {
                return 0;
            }
            return Number(value);
        }, z.number().min(0).max(100))
        .optional()
        .default(0),
    notes: z.string().trim().max(500).optional().nullable(),
});

export const salesOrderSchema = z.object({
    customerId: z.string().min(1, "Customer is required"),
    requiredDate: z.date().optional().nullable(),
    shippingAddress: z.string().trim().max(500).optional().nullable(),
    notes: z.string().trim().max(1000).optional().nullable(),
    items: z
        .array(salesOrderItemSchema)
        .min(1, "A sales order must include at least one line"),
    taxAmount: z
        .preprocess((value) => {
            if (value === "" || value === null || value === undefined) {
                return 0;
            }
            return Number(value);
        }, z.number().int().min(0))
        .optional()
        .default(0),
    shippingCost: z
        .preprocess((value) => {
            if (value === "" || value === null || value === undefined) {
                return 0;
            }
            return Number(value);
        }, z.number().int().min(0))
        .optional()
        .default(0),
});

export type SalesOrderFormData = z.infer<typeof salesOrderSchema>;
