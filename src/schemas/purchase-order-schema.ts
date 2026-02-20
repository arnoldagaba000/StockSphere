import { z } from "zod";

// Each line item on the order is validated as its own object within the array
const purchaseOrderItemSchema = z.object({
    productId: z.string().min(1, "Product is required"),
    quantity: z.number().int().min(1, "Quantity must be at least 1"),

    // Unit price stored as integer minor units of configured currency.
    unitPrice: z.number().min(0, "Unit price cannot be negative"),
    taxRate: z.number().int().min(0).max(100).default(0),

    notes: z.string().max(500).optional().nullable(),
});

export const purchaseOrderSchema = z.object({
    supplierId: z.string().min(1, "Supplier is required"),

    // Expected delivery date — used for planning, not enforced by the system
    expectedDate: z.date().optional().nullable(),

    // These line items represent what is being ordered
    items: z
        .array(purchaseOrderItemSchema)
        .min(1, "A purchase order must have at least one item"),

    // Tax and shipping are stored as integer minor units of configured currency.
    taxAmount: z.number().min(0).default(0),
    shippingCost: z.number().min(0).default(0),

    notes: z.string().max(1000).optional().nullable(),
});

export type PurchaseOrderFormData = z.infer<typeof purchaseOrderSchema>;
