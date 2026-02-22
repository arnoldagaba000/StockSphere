import { toNumber } from "./sales-helpers";

export interface ShipmentLineQuantityRef {
    id: string;
    quantity: number;
    shippedQuantity: number;
}

export interface ShipmentLineRequestRef {
    quantity: number;
}

export const ALLOWED_SHIP_ORDER_STATUSES = new Set([
    "CONFIRMED",
    "PARTIALLY_FULFILLED",
]);

export const getNextOrderStatusAfterShipment = (
    allShipped: boolean,
    anyShipped: boolean
): "CONFIRMED" | "FULFILLED" | "PARTIALLY_FULFILLED" => {
    if (allShipped) {
        return "FULFILLED";
    }

    if (anyShipped) {
        return "PARTIALLY_FULFILLED";
    }

    return "CONFIRMED";
};

export const validateShipmentLineQuantity = ({
    orderItem,
    shipItem,
}: {
    orderItem: ShipmentLineQuantityRef;
    shipItem: ShipmentLineRequestRef;
}): void => {
    const remainingOrderQty =
        orderItem.quantity - toNumber(orderItem.shippedQuantity);

    if (shipItem.quantity > remainingOrderQty) {
        throw new Error(
            `Shipment quantity exceeds remaining quantity for order line ${orderItem.id}.`
        );
    }
};
