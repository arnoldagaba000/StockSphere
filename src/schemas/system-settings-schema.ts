import { z } from "zod";

const prefixSchema = z
    .string()
    .trim()
    .min(1)
    .max(12)
    .regex(
        /^[A-Za-z0-9_-]+$/,
        "Prefix can only include letters, numbers, _ and -"
    );

export const systemSettingsSchema = z.object({
    company: z.object({
        address: z.string().trim().max(500),
        email: z.string().trim().email().or(z.literal("")),
        logoUrl: z.string().trim().url().or(z.literal("")),
        name: z.string().trim().min(1).max(120),
        phone: z.string().trim().max(50),
    }),
    financial: z.object({
        currencyCode: z
            .string()
            .trim()
            .min(3)
            .max(3)
            .regex(
                /^[A-Za-z]{3}$/,
                "Currency code must be a 3-letter ISO code."
            ),
        defaultTaxRatePercent: z.number().int().min(0).max(100),
    }),
    inventoryPolicy: z.object({
        adjustmentApprovalThreshold: z.number().int().min(1).max(1_000_000),
        fiscalYearStartMonth: z.number().int().min(1).max(12),
    }),
    notifications: z.object({
        dailySummaryEnabled: z.boolean(),
        expiryAlertsEnabled: z.boolean(),
        lowStockAlertsEnabled: z.boolean(),
    }),
    numbering: z.object({
        goodsReceiptPrefix: prefixSchema,
        inventoryTransactionPrefix: prefixSchema,
        purchaseOrderPrefix: prefixSchema,
        salesOrderPrefix: prefixSchema,
        shipmentPrefix: prefixSchema,
        stockMovementPrefix: prefixSchema,
    }),
});

export type SystemSettingsInput = z.infer<typeof systemSettingsSchema>;
