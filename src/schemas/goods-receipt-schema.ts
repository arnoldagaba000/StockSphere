import { z } from "zod";

const receiptItemSchema = z.object({
    productId: z.string().min(1),

    // The quantity being received in THIS receipt — may be less than what was ordered
    quantity: z.number().int().min(1, "Quantity must be at least 1"),

    // Where in the warehouse this stock is going
    warehouseId: z.string().min(1, "Warehouse is required"),
    locationId: z.string().optional().nullable(),

    // Tracking fields — conditionally required based on product flags.
    // The server function validates these against the product's configuration.
    batchNumber: z.string().max(100).optional().nullable(),
    serialNumber: z.string().max(100).optional().nullable(),
    expiryDate: z.date().optional().nullable(),
});

export const goodsReceiptSchema = z.object({
    purchaseOrderId: z.string().min(1, "Purchase order is required"),
    receivedDate: z.date().default(() => new Date()),
    items: z.array(receiptItemSchema).min(1, "Must receive at least one item"),
    notes: z.string().max(1000).optional().nullable(),
});

export type GoodsReceiptFormData = z.infer<typeof goodsReceiptSchema>;
