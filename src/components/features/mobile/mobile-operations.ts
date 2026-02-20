import { receiveGoods } from "@/features/inventory/receive-goods";
import { transferStock } from "@/features/inventory/transfer-stock";
import { getSalesOrderDetail } from "@/features/sales/get-sales-order-detail";
import { shipOrder } from "@/features/sales/ship-order";

export interface MobileReceivePayload {
    batchNumber: string | null;
    productId: string;
    quantity: number;
    unitCost: number | null;
    warehouseId: string;
}

export interface MobilePickPayload {
    salesOrderId: string;
}

export interface MobileTransferPayload {
    quantity: number;
    stockItemId: string;
    toWarehouseId: string;
}

export type MobileOperationPayload =
    | MobileReceivePayload
    | MobilePickPayload
    | MobileTransferPayload;

export type MobileOperationType = "RECEIVE" | "PICK" | "TRANSFER";

export interface QueuedMobileOperation<T extends MobileOperationPayload> {
    createdAt: string;
    id: string;
    payload: T;
    type: MobileOperationType;
}

interface ShipmentLine {
    quantity: number;
    salesOrderItemId: string;
    stockItemId: string;
}

const buildShipmentLines = (
    order: Awaited<ReturnType<typeof getSalesOrderDetail>>
): ShipmentLine[] => {
    const shipmentLines: ShipmentLine[] = [];

    for (const item of order.items) {
        let remaining = item.quantity - item.shippedQuantity;
        if (remaining <= 0) {
            continue;
        }

        const productBuckets = order.stockBuckets
            .filter((bucket) => bucket.productId === item.productId)
            .sort(
                (left, right) =>
                    left.availableQuantity - right.availableQuantity
            );

        for (const bucket of productBuckets) {
            if (remaining <= 0) {
                break;
            }
            if (bucket.availableQuantity <= 0) {
                continue;
            }

            const allocatedQuantity = Math.min(
                remaining,
                bucket.availableQuantity
            );
            shipmentLines.push({
                quantity: allocatedQuantity,
                salesOrderItemId: item.id,
                stockItemId: bucket.id,
            });
            remaining -= allocatedQuantity;
        }

        if (remaining > 0) {
            throw new Error(
                `Insufficient available stock to pick ${item.product.sku}.`
            );
        }
    }

    return shipmentLines;
};

export const processMobilePick = async (
    salesOrderId: string
): Promise<ShipmentLine[]> => {
    const order = await getSalesOrderDetail({
        data: { salesOrderId },
    });
    const shipmentLines = buildShipmentLines(order);

    if (shipmentLines.length === 0) {
        throw new Error("No remaining lines to ship for this order.");
    }

    await shipOrder({
        data: {
            carrier: "Mobile Pick",
            items: shipmentLines,
            notes: "Auto-picked via mobile workflow",
            salesOrderId,
            shippedDate: new Date(),
            trackingNumber: null,
        },
    });

    return shipmentLines;
};

export const executeMobileOperation = async (
    operation: QueuedMobileOperation<MobileOperationPayload>
): Promise<void> => {
    if (operation.type === "RECEIVE") {
        const payload = operation.payload as MobileReceivePayload;
        await receiveGoods({
            data: {
                items: [
                    {
                        batchNumber: payload.batchNumber,
                        expiryDate: null,
                        productId: payload.productId,
                        quantity: payload.quantity,
                        unitCost: payload.unitCost,
                    },
                ],
                locationId: null,
                notes: "Posted via mobile receive",
                purchaseOrderId: null,
                warehouseId: payload.warehouseId,
            },
        });
        return;
    }

    if (operation.type === "PICK") {
        const payload = operation.payload as MobilePickPayload;
        await processMobilePick(payload.salesOrderId);
        return;
    }

    const payload = operation.payload as MobileTransferPayload;
    await transferStock({
        data: {
            notes: "Posted via mobile transfer",
            quantity: payload.quantity,
            stockItemId: payload.stockItemId,
            toLocationId: null,
            toWarehouseId: payload.toWarehouseId,
        },
    });
};
