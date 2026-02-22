import { describe, expect, test } from "bun:test";
import {
    getCustomerDefaultShippingAddress,
    getDefaultPurchaseUnitPrice,
    getDefaultSalesUnitPrice,
} from "@/features/orders/order-form-defaults";

describe("order form defaults", () => {
    test("returns purchase unit price from product cost", () => {
        const value = getDefaultPurchaseUnitPrice(
            [
                {
                    costPrice: 12_500,
                    id: "p1",
                },
            ],
            "p1"
        );

        expect(value).toBe("12500");
    });

    test("returns empty purchase unit price when missing", () => {
        const value = getDefaultPurchaseUnitPrice(
            [
                {
                    costPrice: null,
                    id: "p1",
                },
            ],
            "p1"
        );

        expect(value).toBe("");
    });

    test("returns sales unit price from product selling price", () => {
        const value = getDefaultSalesUnitPrice(
            [
                {
                    id: "p1",
                    sellingPrice: 18_900,
                },
            ],
            "p1"
        );

        expect(value).toBe("18900");
    });

    test("returns trimmed customer address", () => {
        const address = getCustomerDefaultShippingAddress(
            [
                {
                    address: "  Kampala, UG  ",
                    id: "c1",
                },
            ],
            "c1"
        );

        expect(address).toBe("Kampala, UG");
    });
});
