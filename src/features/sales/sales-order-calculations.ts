import { toNumber } from "./sales-helpers";

interface SalesOrderDraftItem {
    discountPercent?: number | null;
    notes?: string | null;
    productId: string;
    quantity: number;
    taxRate: number;
    unitPrice: number;
}

export interface SalesOrderLineTotals {
    notes: string | null;
    productId: string;
    quantity: number;
    taxRate: number;
    totalPrice: number;
    unitPrice: number;
}

export interface SalesOrderTotals {
    shippingCost: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
}

export const buildSalesOrderLineTotals = (
    items: SalesOrderDraftItem[]
): SalesOrderLineTotals[] =>
    items.map((item) => {
        const discountAmount = Math.round(
            item.quantity * item.unitPrice * ((item.discountPercent ?? 0) / 100)
        );
        const netBeforeTax = item.quantity * item.unitPrice - discountAmount;
        const lineTax = Math.round(netBeforeTax * (item.taxRate / 100));
        const totalPrice = netBeforeTax + lineTax;

        return {
            notes: item.notes ?? null,
            productId: item.productId,
            quantity: item.quantity,
            taxRate: item.taxRate,
            totalPrice,
            unitPrice: item.unitPrice,
        };
    });

export const computeSalesOrderTotals = ({
    additionalTaxAmount,
    shippingCost,
    items,
}: {
    additionalTaxAmount: number;
    items: SalesOrderLineTotals[];
    shippingCost: number;
}): SalesOrderTotals => {
    const subtotal = items.reduce(
        (sum, item) =>
            sum + Math.round(toNumber(item.quantity) * item.unitPrice),
        0
    );
    const computedTaxAmount = items.reduce((sum, item) => {
        const lineBase = Math.round(toNumber(item.quantity) * item.unitPrice);
        return sum + Math.round(lineBase * (item.taxRate / 100));
    }, 0);
    const taxAmount = computedTaxAmount + additionalTaxAmount;
    const totalAmount = subtotal + taxAmount + shippingCost;

    return {
        shippingCost,
        subtotal,
        taxAmount,
        totalAmount,
    };
};
