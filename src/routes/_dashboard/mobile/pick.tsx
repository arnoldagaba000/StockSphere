import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getSalesOrderDetail } from "@/features/sales/get-sales-order-detail";
import { getSalesOrders } from "@/features/sales/get-sales-orders";
import { shipOrder } from "@/features/sales/ship-order";

interface SalesOrderOption {
    id: string;
    label: string;
}

interface PickPageState {
    isSubmitting: boolean;
    selectedOrderId: string;
    selectedOrderLabel: string;
}

interface ShipmentLine {
    quantity: number;
    salesOrderItemId: string;
    stockItemId: string;
}

const pickPageReducer = (
    state: PickPageState,
    patch: Partial<PickPageState>
): PickPageState => ({ ...state, ...patch });

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

const processMobilePick = async (
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

export const Route = createFileRoute("/_dashboard/mobile/pick")({
    component: MobilePickPage,
    loader: async () => {
        const [confirmed, partiallyFulfilled] = await Promise.all([
            getSalesOrders({
                data: {
                    page: 1,
                    pageSize: 40,
                    status: "CONFIRMED",
                },
            }),
            getSalesOrders({
                data: {
                    page: 1,
                    pageSize: 40,
                    status: "PARTIALLY_FULFILLED",
                },
            }),
        ]);

        const options = [...confirmed.orders, ...partiallyFulfilled.orders]
            .sort(
                (left, right) =>
                    right.createdAt.getTime() - left.createdAt.getTime()
            )
            .map(
                (order): SalesOrderOption => ({
                    id: order.id,
                    label: `${order.orderNumber} · ${order.customer.name}`,
                })
            );

        return { orderOptions: options };
    },
});

function MobilePickPage() {
    const router = useRouter();
    const { orderOptions } = Route.useLoaderData();
    const [state, setState] = useReducer(pickPageReducer, {
        isSubmitting: false,
        selectedOrderId: orderOptions[0]?.id ?? "",
        selectedOrderLabel: orderOptions[0]?.label ?? "",
    });

    const selectedOrderLabel =
        orderOptions.find((entry) => entry.id === state.selectedOrderId)
            ?.label ?? state.selectedOrderLabel;

    const handleShip = async () => {
        if (!state.selectedOrderId) {
            toast.error("Select an order.");
            return;
        }

        try {
            setState({ isSubmitting: true });
            await processMobilePick(state.selectedOrderId);
            toast.success("Order picked and shipped.");
            setState({ isSubmitting: false });
            await router.invalidate();
        } catch (error) {
            setState({ isSubmitting: false });
            toast.error(
                error instanceof Error ? error.message : "Pick failed."
            );
        }
    };

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <CardTitle>Mobile Pick</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="mobile-pick-order">Sales Order</Label>
                    <Select
                        onValueChange={(value) =>
                            setState({
                                selectedOrderId: value ?? "",
                                selectedOrderLabel:
                                    orderOptions.find(
                                        (entry) => entry.id === value
                                    )?.label ?? "",
                            })
                        }
                        value={state.selectedOrderId}
                    >
                        <SelectTrigger id="mobile-pick-order">
                            <SelectValue placeholder="Select order to pick" />
                        </SelectTrigger>
                        <SelectContent>
                            {orderOptions.map((order) => (
                                <SelectItem key={order.id} value={order.id}>
                                    {order.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="rounded-md border p-3 text-sm">
                    <p className="font-medium">Selected</p>
                    <p className="text-muted-foreground">
                        {selectedOrderLabel || "No order selected"}
                    </p>
                </div>

                <Button
                    className="min-h-11 w-full"
                    disabled={state.isSubmitting || !state.selectedOrderId}
                    onClick={() => {
                        handleShip().catch(() => undefined);
                    }}
                    type="button"
                >
                    {state.isSubmitting ? "Processing..." : "Pick & Ship Order"}
                </Button>
            </CardContent>
        </Card>
    );
}
