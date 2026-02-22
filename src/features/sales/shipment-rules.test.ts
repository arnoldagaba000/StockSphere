import { describe, expect, test } from "bun:test";
import {
    ALLOWED_SHIP_ORDER_STATUSES,
    getNextOrderStatusAfterShipment,
    validateShipmentLineQuantity,
} from "@/features/sales/shipment-rules";

describe("shipment-rules", () => {
    test("defines allowed statuses for shipping", () => {
        expect(ALLOWED_SHIP_ORDER_STATUSES.has("CONFIRMED")).toBe(true);
        expect(ALLOWED_SHIP_ORDER_STATUSES.has("PARTIALLY_FULFILLED")).toBe(
            true
        );
        expect(ALLOWED_SHIP_ORDER_STATUSES.has("DRAFT")).toBe(false);
    });

    test("computes next order status after shipment", () => {
        expect(getNextOrderStatusAfterShipment(true, true)).toBe("FULFILLED");
        expect(getNextOrderStatusAfterShipment(false, true)).toBe(
            "PARTIALLY_FULFILLED"
        );
        expect(getNextOrderStatusAfterShipment(false, false)).toBe("CONFIRMED");
    });

    test("blocks shipment quantities above remaining amount", () => {
        expect(() =>
            validateShipmentLineQuantity({
                orderItem: {
                    id: "line-1",
                    quantity: 5,
                    shippedQuantity: 2,
                },
                shipItem: {
                    quantity: 4,
                },
            })
        ).toThrow(
            "Shipment quantity exceeds remaining quantity for order line line-1."
        );
    });

    test("allows shipment within remaining amount", () => {
        expect(() =>
            validateShipmentLineQuantity({
                orderItem: {
                    id: "line-2",
                    quantity: 5,
                    shippedQuantity: 2,
                },
                shipItem: {
                    quantity: 3,
                },
            })
        ).not.toThrow();
    });
});
