import { describe, expect, test } from "bun:test";
import {
    buildPurchaseOrderLineTotals,
    computePurchaseOrderTotals,
} from "@/features/purchases/purchase-order-calculations";

describe("purchase-order-calculations", () => {
    test("builds rounded purchase order line totals", () => {
        const lines = buildPurchaseOrderLineTotals([
            {
                notes: "line note",
                productId: "p1",
                quantity: 3,
                taxRate: 18,
                unitPrice: 1000.49,
            },
        ]);

        expect(lines).toHaveLength(1);
        expect(lines[0]?.unitPrice).toBe(1000);
        expect(lines[0]?.totalPrice).toBe(3000);
        expect(lines[0]?.notes).toBe("line note");
    });

    test("computes subtotal and total amount", () => {
        const totals = computePurchaseOrderTotals({
            items: [
                {
                    notes: null,
                    productId: "p1",
                    quantity: 2,
                    taxRate: 0,
                    totalPrice: 5000,
                    unitPrice: 2500,
                },
                {
                    notes: null,
                    productId: "p2",
                    quantity: 1,
                    taxRate: 0,
                    totalPrice: 1500,
                    unitPrice: 1500,
                },
            ],
            shippingCost: 199.6,
            taxAmount: 120.4,
        });

        expect(totals.subtotal).toBe(6500);
        expect(totals.shippingCost).toBe(200);
        expect(totals.taxAmount).toBe(120);
        expect(totals.totalAmount).toBe(6820);
    });
});
