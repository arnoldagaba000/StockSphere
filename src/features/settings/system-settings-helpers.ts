import type { SystemSetting } from "@/generated/prisma/client";

export const SYSTEM_SETTING_KEYS = {
    COMPANY_ADDRESS: "company.address",
    COMPANY_EMAIL: "company.email",
    COMPANY_LOGO_URL: "company.logo_url",
    COMPANY_NAME: "company.name",
    COMPANY_PHONE: "company.phone",
    FISCAL_YEAR_START_MONTH: "inventory.fiscal_year_start_month",
    INVENTORY_ADJUSTMENT_APPROVAL_THRESHOLD:
        "inventory.adjustment_approval_threshold",
    NOTIFICATIONS_DAILY_SUMMARY: "notifications.email.daily_summary",
    NOTIFICATIONS_EXPIRY_ALERTS: "notifications.email.expiry_alerts",
    NOTIFICATIONS_LOW_STOCK: "notifications.email.low_stock",
    NUMBERING_GOODS_RECEIPT_PREFIX: "numbering.goods_receipt_prefix",
    NUMBERING_INVENTORY_TRANSACTION_PREFIX:
        "numbering.inventory_transaction_prefix",
    NUMBERING_PURCHASE_ORDER_PREFIX: "numbering.purchase_order_prefix",
    NUMBERING_SALES_ORDER_PREFIX: "numbering.sales_order_prefix",
    NUMBERING_SHIPMENT_PREFIX: "numbering.shipment_prefix",
    NUMBERING_STOCK_MOVEMENT_PREFIX: "numbering.stock_movement_prefix",
    TAX_DEFAULT_RATE: "financial.default_tax_rate",
    TAX_DEFAULT_RATE_BPS: "financial.default_tax_rate_bps",
    FINANCIAL_CURRENCY_CODE: "financial.currency_code",
} as const;

export type SystemSettingKey =
    (typeof SYSTEM_SETTING_KEYS)[keyof typeof SYSTEM_SETTING_KEYS];

const DEFAULT_SYSTEM_SETTINGS: Record<SystemSettingKey, string> = {
    [SYSTEM_SETTING_KEYS.COMPANY_ADDRESS]: "",
    [SYSTEM_SETTING_KEYS.COMPANY_EMAIL]: "",
    [SYSTEM_SETTING_KEYS.COMPANY_LOGO_URL]: "",
    [SYSTEM_SETTING_KEYS.COMPANY_NAME]: "StockSphere",
    [SYSTEM_SETTING_KEYS.COMPANY_PHONE]: "",
    [SYSTEM_SETTING_KEYS.FISCAL_YEAR_START_MONTH]: "1",
    [SYSTEM_SETTING_KEYS.FINANCIAL_CURRENCY_CODE]: "UGX",
    [SYSTEM_SETTING_KEYS.INVENTORY_ADJUSTMENT_APPROVAL_THRESHOLD]: "100",
    [SYSTEM_SETTING_KEYS.NOTIFICATIONS_DAILY_SUMMARY]: "false",
    [SYSTEM_SETTING_KEYS.NOTIFICATIONS_EXPIRY_ALERTS]: "true",
    [SYSTEM_SETTING_KEYS.NOTIFICATIONS_LOW_STOCK]: "true",
    [SYSTEM_SETTING_KEYS.NUMBERING_GOODS_RECEIPT_PREFIX]: "GRN",
    [SYSTEM_SETTING_KEYS.NUMBERING_INVENTORY_TRANSACTION_PREFIX]: "IT",
    [SYSTEM_SETTING_KEYS.NUMBERING_PURCHASE_ORDER_PREFIX]: "PO",
    [SYSTEM_SETTING_KEYS.NUMBERING_SALES_ORDER_PREFIX]: "SO",
    [SYSTEM_SETTING_KEYS.NUMBERING_SHIPMENT_PREFIX]: "SHP",
    [SYSTEM_SETTING_KEYS.NUMBERING_STOCK_MOVEMENT_PREFIX]: "MV",
    [SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE]: "18",
    [SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE_BPS]: "1800",
};

export const getDefaultSystemSettingValue = (key: SystemSettingKey): string =>
    DEFAULT_SYSTEM_SETTINGS[key];

const SYSTEM_SETTING_DESCRIPTIONS: Record<SystemSettingKey, string> = {
    [SYSTEM_SETTING_KEYS.COMPANY_ADDRESS]:
        "Company address shown on documents and reports.",
    [SYSTEM_SETTING_KEYS.COMPANY_EMAIL]:
        "Primary company email for outgoing communications.",
    [SYSTEM_SETTING_KEYS.COMPANY_LOGO_URL]:
        "Public URL to the company logo asset.",
    [SYSTEM_SETTING_KEYS.COMPANY_NAME]:
        "Legal or trade name used across the application.",
    [SYSTEM_SETTING_KEYS.COMPANY_PHONE]: "Primary company phone number.",
    [SYSTEM_SETTING_KEYS.FISCAL_YEAR_START_MONTH]:
        "Fiscal year start month as 1-12.",
    [SYSTEM_SETTING_KEYS.FINANCIAL_CURRENCY_CODE]:
        "Default currency code for display and documents.",
    [SYSTEM_SETTING_KEYS.INVENTORY_ADJUSTMENT_APPROVAL_THRESHOLD]:
        "Absolute quantity threshold requiring approval for adjustments.",
    [SYSTEM_SETTING_KEYS.NOTIFICATIONS_DAILY_SUMMARY]:
        "Enable daily operational summary email notifications.",
    [SYSTEM_SETTING_KEYS.NOTIFICATIONS_EXPIRY_ALERTS]:
        "Enable email alerts for upcoming expiries.",
    [SYSTEM_SETTING_KEYS.NOTIFICATIONS_LOW_STOCK]:
        "Enable email alerts for low stock events.",
    [SYSTEM_SETTING_KEYS.NUMBERING_GOODS_RECEIPT_PREFIX]:
        "Prefix for generated goods receipt numbers.",
    [SYSTEM_SETTING_KEYS.NUMBERING_INVENTORY_TRANSACTION_PREFIX]:
        "Prefix for generated inventory transaction numbers.",
    [SYSTEM_SETTING_KEYS.NUMBERING_PURCHASE_ORDER_PREFIX]:
        "Prefix for generated purchase order numbers.",
    [SYSTEM_SETTING_KEYS.NUMBERING_SALES_ORDER_PREFIX]:
        "Prefix for generated sales order numbers.",
    [SYSTEM_SETTING_KEYS.NUMBERING_SHIPMENT_PREFIX]:
        "Prefix for generated shipment numbers.",
    [SYSTEM_SETTING_KEYS.NUMBERING_STOCK_MOVEMENT_PREFIX]:
        "Prefix for generated stock movement numbers.",
    [SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE]:
        "Default tax rate percent for new sales and purchasing drafts.",
    [SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE_BPS]:
        "Default tax rate in basis points (100 bps = 1%).",
};

const getBoolean = (value: string): boolean => value === "true";

const toIntegerInRange = (
    value: string,
    fallback: number,
    min: number,
    max: number
): number => {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) {
        return fallback;
    }

    const rounded = Math.round(parsed);
    return Math.min(max, Math.max(min, rounded));
};

const readValue = (
    values: Partial<Record<SystemSettingKey, string>>,
    key: SystemSettingKey
): string => values[key] ?? DEFAULT_SYSTEM_SETTINGS[key];

export interface SystemSettingsPayload {
    company: {
        address: string;
        email: string;
        logoUrl: string;
        name: string;
        phone: string;
    };
    financial: {
        currencyCode: string;
        defaultTaxRatePercent: number;
    };
    inventoryPolicy: {
        adjustmentApprovalThreshold: number;
        fiscalYearStartMonth: number;
    };
    notifications: {
        dailySummaryEnabled: boolean;
        expiryAlertsEnabled: boolean;
        lowStockAlertsEnabled: boolean;
    };
    numbering: {
        goodsReceiptPrefix: string;
        inventoryTransactionPrefix: string;
        purchaseOrderPrefix: string;
        salesOrderPrefix: string;
        shipmentPrefix: string;
        stockMovementPrefix: string;
    };
}

export const mapSystemSettings = (
    rows: Pick<SystemSetting, "key" | "value">[]
): SystemSettingsPayload => {
    const values = rows.reduce<Partial<Record<SystemSettingKey, string>>>(
        (acc, row) => {
            if (
                (Object.values(SYSTEM_SETTING_KEYS) as string[]).includes(
                    row.key
                )
            ) {
                acc[row.key as SystemSettingKey] = row.value;
            }
            return acc;
        },
        {}
    );

    return {
        company: {
            address: readValue(values, SYSTEM_SETTING_KEYS.COMPANY_ADDRESS),
            email: readValue(values, SYSTEM_SETTING_KEYS.COMPANY_EMAIL),
            logoUrl: readValue(values, SYSTEM_SETTING_KEYS.COMPANY_LOGO_URL),
            name: readValue(values, SYSTEM_SETTING_KEYS.COMPANY_NAME),
            phone: readValue(values, SYSTEM_SETTING_KEYS.COMPANY_PHONE),
        },
        financial: {
            currencyCode: readValue(
                values,
                SYSTEM_SETTING_KEYS.FINANCIAL_CURRENCY_CODE
            ),
            defaultTaxRatePercent: toIntegerInRange(
                readValue(values, SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE),
                18,
                0,
                100
            ),
        },
        inventoryPolicy: {
            adjustmentApprovalThreshold: toIntegerInRange(
                readValue(
                    values,
                    SYSTEM_SETTING_KEYS.INVENTORY_ADJUSTMENT_APPROVAL_THRESHOLD
                ),
                100,
                1,
                1_000_000
            ),
            fiscalYearStartMonth: toIntegerInRange(
                readValue(values, SYSTEM_SETTING_KEYS.FISCAL_YEAR_START_MONTH),
                1,
                1,
                12
            ),
        },
        notifications: {
            dailySummaryEnabled: getBoolean(
                readValue(
                    values,
                    SYSTEM_SETTING_KEYS.NOTIFICATIONS_DAILY_SUMMARY
                )
            ),
            expiryAlertsEnabled: getBoolean(
                readValue(
                    values,
                    SYSTEM_SETTING_KEYS.NOTIFICATIONS_EXPIRY_ALERTS
                )
            ),
            lowStockAlertsEnabled: getBoolean(
                readValue(values, SYSTEM_SETTING_KEYS.NOTIFICATIONS_LOW_STOCK)
            ),
        },
        numbering: {
            goodsReceiptPrefix: readValue(
                values,
                SYSTEM_SETTING_KEYS.NUMBERING_GOODS_RECEIPT_PREFIX
            ),
            inventoryTransactionPrefix: readValue(
                values,
                SYSTEM_SETTING_KEYS.NUMBERING_INVENTORY_TRANSACTION_PREFIX
            ),
            purchaseOrderPrefix: readValue(
                values,
                SYSTEM_SETTING_KEYS.NUMBERING_PURCHASE_ORDER_PREFIX
            ),
            salesOrderPrefix: readValue(
                values,
                SYSTEM_SETTING_KEYS.NUMBERING_SALES_ORDER_PREFIX
            ),
            shipmentPrefix: readValue(
                values,
                SYSTEM_SETTING_KEYS.NUMBERING_SHIPMENT_PREFIX
            ),
            stockMovementPrefix: readValue(
                values,
                SYSTEM_SETTING_KEYS.NUMBERING_STOCK_MOVEMENT_PREFIX
            ),
        },
    };
};

export const toSettingRows = (
    settings: SystemSettingsPayload
): { description: string; key: SystemSettingKey; value: string }[] => [
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[SYSTEM_SETTING_KEYS.COMPANY_NAME],
        key: SYSTEM_SETTING_KEYS.COMPANY_NAME,
        value: settings.company.name.trim(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[SYSTEM_SETTING_KEYS.COMPANY_ADDRESS],
        key: SYSTEM_SETTING_KEYS.COMPANY_ADDRESS,
        value: settings.company.address.trim(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[SYSTEM_SETTING_KEYS.COMPANY_EMAIL],
        key: SYSTEM_SETTING_KEYS.COMPANY_EMAIL,
        value: settings.company.email.trim(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[SYSTEM_SETTING_KEYS.COMPANY_PHONE],
        key: SYSTEM_SETTING_KEYS.COMPANY_PHONE,
        value: settings.company.phone.trim(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[SYSTEM_SETTING_KEYS.COMPANY_LOGO_URL],
        key: SYSTEM_SETTING_KEYS.COMPANY_LOGO_URL,
        value: settings.company.logoUrl.trim(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.FINANCIAL_CURRENCY_CODE
            ],
        key: SYSTEM_SETTING_KEYS.FINANCIAL_CURRENCY_CODE,
        value: settings.financial.currencyCode.trim().toUpperCase(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE],
        key: SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE,
        value: String(settings.financial.defaultTaxRatePercent),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE_BPS
            ],
        key: SYSTEM_SETTING_KEYS.TAX_DEFAULT_RATE_BPS,
        value: String(settings.financial.defaultTaxRatePercent * 100),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NUMBERING_SALES_ORDER_PREFIX
            ],
        key: SYSTEM_SETTING_KEYS.NUMBERING_SALES_ORDER_PREFIX,
        value: settings.numbering.salesOrderPrefix.trim().toUpperCase(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NUMBERING_PURCHASE_ORDER_PREFIX
            ],
        key: SYSTEM_SETTING_KEYS.NUMBERING_PURCHASE_ORDER_PREFIX,
        value: settings.numbering.purchaseOrderPrefix.trim().toUpperCase(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NUMBERING_SHIPMENT_PREFIX
            ],
        key: SYSTEM_SETTING_KEYS.NUMBERING_SHIPMENT_PREFIX,
        value: settings.numbering.shipmentPrefix.trim().toUpperCase(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NUMBERING_GOODS_RECEIPT_PREFIX
            ],
        key: SYSTEM_SETTING_KEYS.NUMBERING_GOODS_RECEIPT_PREFIX,
        value: settings.numbering.goodsReceiptPrefix.trim().toUpperCase(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NUMBERING_INVENTORY_TRANSACTION_PREFIX
            ],
        key: SYSTEM_SETTING_KEYS.NUMBERING_INVENTORY_TRANSACTION_PREFIX,
        value: settings.numbering.inventoryTransactionPrefix
            .trim()
            .toUpperCase(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NUMBERING_STOCK_MOVEMENT_PREFIX
            ],
        key: SYSTEM_SETTING_KEYS.NUMBERING_STOCK_MOVEMENT_PREFIX,
        value: settings.numbering.stockMovementPrefix.trim().toUpperCase(),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.INVENTORY_ADJUSTMENT_APPROVAL_THRESHOLD
            ],
        key: SYSTEM_SETTING_KEYS.INVENTORY_ADJUSTMENT_APPROVAL_THRESHOLD,
        value: String(settings.inventoryPolicy.adjustmentApprovalThreshold),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.FISCAL_YEAR_START_MONTH
            ],
        key: SYSTEM_SETTING_KEYS.FISCAL_YEAR_START_MONTH,
        value: String(settings.inventoryPolicy.fiscalYearStartMonth),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NOTIFICATIONS_LOW_STOCK
            ],
        key: SYSTEM_SETTING_KEYS.NOTIFICATIONS_LOW_STOCK,
        value: String(settings.notifications.lowStockAlertsEnabled),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NOTIFICATIONS_EXPIRY_ALERTS
            ],
        key: SYSTEM_SETTING_KEYS.NOTIFICATIONS_EXPIRY_ALERTS,
        value: String(settings.notifications.expiryAlertsEnabled),
    },
    {
        description:
            SYSTEM_SETTING_DESCRIPTIONS[
                SYSTEM_SETTING_KEYS.NOTIFICATIONS_DAILY_SUMMARY
            ],
        key: SYSTEM_SETTING_KEYS.NOTIFICATIONS_DAILY_SUMMARY,
        value: String(settings.notifications.dailySummaryEnabled),
    },
];
