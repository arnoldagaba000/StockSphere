interface PurchaseOrderDraftItem {
    notes?: string | null;
    productId: string;
    quantity: number;
    taxRate: number;
    unitPrice: number;
}

export interface PurchaseOrderLineTotals {
    notes: string | null;
    productId: string;
    quantity: number;
    taxRate: number;
    totalPrice: number;
    unitPrice: number;
}

export interface PurchaseOrderTotals {
    shippingCost: number;
    subtotal: number;
    taxAmount: number;
    totalAmount: number;
}

export const buildPurchaseOrderLineTotals = (
    items: PurchaseOrderDraftItem[]
): PurchaseOrderLineTotals[] =>
    items.map((item) => {
        const unitPrice = Math.round(item.unitPrice);
        const totalPrice = Math.round(item.quantity * unitPrice);
        return {
            notes: item.notes ?? null,
            productId: item.productId,
            quantity: item.quantity,
            taxRate: item.taxRate,
            totalPrice,
            unitPrice,
        };
    });

export const computePurchaseOrderTotals = ({
    shippingCost,
    taxAmount,
    items,
}: {
    items: PurchaseOrderLineTotals[];
    shippingCost: number;
    taxAmount: number;
}): PurchaseOrderTotals => {
    const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);
    const roundedTaxAmount = Math.round(taxAmount);
    const roundedShippingCost = Math.round(shippingCost);
    const totalAmount = subtotal + roundedTaxAmount + roundedShippingCost;

    return {
        shippingCost: roundedShippingCost,
        subtotal,
        taxAmount: roundedTaxAmount,
        totalAmount,
    };
};
