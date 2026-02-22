import { describe, expect, test } from "bun:test";
import {
    buildSalesOrderLineTotals,
    computeSalesOrderTotals,
} from "@/features/sales/sales-order-calculations";

describe("sales-order-calculations", () => {
    test("builds line totals with discount and line tax", () => {
        const lines = buildSalesOrderLineTotals([
            {
                discountPercent: 10,
                notes: null,
                productId: "p1",
                quantity: 2,
                taxRate: 18,
                unitPrice: 1000,
            },
        ]);

        expect(lines).toHaveLength(1);
        expect(lines[0]?.totalPrice).toBe(2124);
    });

    test("computes subtotal, tax and final total", () => {
        const totals = computeSalesOrderTotals({
            additionalTaxAmount: 100,
            items: [
                {
                    notes: null,
                    productId: "p1",
                    quantity: 2,
                    taxRate: 18,
                    totalPrice: 2360,
                    unitPrice: 1000,
                },
                {
                    notes: null,
                    productId: "p2",
                    quantity: 1,
                    taxRate: 0,
                    totalPrice: 500,
                    unitPrice: 500,
                },
            ],
            shippingCost: 250,
        });

        expect(totals.subtotal).toBe(2500);
        expect(totals.taxAmount).toBe(460);
        expect(totals.totalAmount).toBe(3210);
    });
});
