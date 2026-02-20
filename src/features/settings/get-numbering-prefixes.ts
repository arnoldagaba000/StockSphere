import { prisma } from "@/db";
import {
    getDefaultSystemSettingValue,
    SYSTEM_SETTING_KEYS,
} from "@/features/settings/system-settings-helpers";

export interface NumberingPrefixes {
    goodsReceipt: string;
    inventoryTransaction: string;
    purchaseOrder: string;
    salesOrder: string;
    shipment: string;
    stockMovement: string;
}

const NUMBERING_KEYS = [
    SYSTEM_SETTING_KEYS.NUMBERING_GOODS_RECEIPT_PREFIX,
    SYSTEM_SETTING_KEYS.NUMBERING_INVENTORY_TRANSACTION_PREFIX,
    SYSTEM_SETTING_KEYS.NUMBERING_PURCHASE_ORDER_PREFIX,
    SYSTEM_SETTING_KEYS.NUMBERING_SALES_ORDER_PREFIX,
    SYSTEM_SETTING_KEYS.NUMBERING_SHIPMENT_PREFIX,
    SYSTEM_SETTING_KEYS.NUMBERING_STOCK_MOVEMENT_PREFIX,
] as const;

const sanitizePrefix = (value: string, fallback: string): string => {
    const normalized = value
        .trim()
        .toUpperCase()
        .replace(/[^A-Z0-9_-]/g, "");
    return normalized.length > 0 ? normalized : fallback;
};

export const getNumberingPrefixes = async (): Promise<NumberingPrefixes> => {
    const rows = await prisma.systemSetting.findMany({
        select: {
            key: true,
            value: true,
        },
        where: {
            key: {
                in: [...NUMBERING_KEYS],
            },
        },
    });

    const values = new Map(rows.map((row) => [row.key, row.value] as const));

    return {
        goodsReceipt: sanitizePrefix(
            values.get(SYSTEM_SETTING_KEYS.NUMBERING_GOODS_RECEIPT_PREFIX) ??
                getDefaultSystemSettingValue(
                    SYSTEM_SETTING_KEYS.NUMBERING_GOODS_RECEIPT_PREFIX
                ),
            "GRN"
        ),
        inventoryTransaction: sanitizePrefix(
            values.get(
                SYSTEM_SETTING_KEYS.NUMBERING_INVENTORY_TRANSACTION_PREFIX
            ) ??
                getDefaultSystemSettingValue(
                    SYSTEM_SETTING_KEYS.NUMBERING_INVENTORY_TRANSACTION_PREFIX
                ),
            "IT"
        ),
        purchaseOrder: sanitizePrefix(
            values.get(SYSTEM_SETTING_KEYS.NUMBERING_PURCHASE_ORDER_PREFIX) ??
                getDefaultSystemSettingValue(
                    SYSTEM_SETTING_KEYS.NUMBERING_PURCHASE_ORDER_PREFIX
                ),
            "PO"
        ),
        salesOrder: sanitizePrefix(
            values.get(SYSTEM_SETTING_KEYS.NUMBERING_SALES_ORDER_PREFIX) ??
                getDefaultSystemSettingValue(
                    SYSTEM_SETTING_KEYS.NUMBERING_SALES_ORDER_PREFIX
                ),
            "SO"
        ),
        shipment: sanitizePrefix(
            values.get(SYSTEM_SETTING_KEYS.NUMBERING_SHIPMENT_PREFIX) ??
                getDefaultSystemSettingValue(
                    SYSTEM_SETTING_KEYS.NUMBERING_SHIPMENT_PREFIX
                ),
            "SHP"
        ),
        stockMovement: sanitizePrefix(
            values.get(SYSTEM_SETTING_KEYS.NUMBERING_STOCK_MOVEMENT_PREFIX) ??
                getDefaultSystemSettingValue(
                    SYSTEM_SETTING_KEYS.NUMBERING_STOCK_MOVEMENT_PREFIX
                ),
            "MV"
        ),
    };
};
