import { z } from "zod";

const shipmentItemSchema = z.object({
    salesOrderItemId: z.string().min(1, "Order line is required"),
    stockItemId: z.string().min(1, "Stock bucket is required"),
    quantity: z.preprocess(
        (value) => Number(value),
        z.number().positive("Quantity must be greater than zero")
    ),
});

export const shipmentSchema = z.object({
    salesOrderId: z.string().min(1, "Sales order is required"),
    shippedDate: z
        .date()
        .optional()
        .default(() => new Date()),
    carrier: z.string().trim().max(100).optional().nullable(),
    trackingNumber: z.string().trim().max(100).optional().nullable(),
    items: z
        .array(shipmentItemSchema)
        .min(1, "Shipment must include at least one line"),
    notes: z.string().trim().max(1000).optional().nullable(),
});

export type ShipmentFormData = z.infer<typeof shipmentSchema>;
