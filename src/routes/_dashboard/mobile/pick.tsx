import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import { processMobilePick } from "@/components/features/mobile/mobile-operations";
import {
    isLikelyNetworkError,
    queueMobileOperation,
} from "@/components/features/mobile/offline-ops-queue";
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
import { getSalesOrders } from "@/features/sales/get-sales-orders";

interface SalesOrderOption {
    id: string;
    label: string;
}

interface PickPageState {
    isSubmitting: boolean;
    selectedOrderId: string;
    selectedOrderLabel: string;
}

const pickPageReducer = (
    state: PickPageState,
    patch: Partial<PickPageState>
): PickPageState => ({ ...state, ...patch });

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
            if (isLikelyNetworkError(error)) {
                queueMobileOperation({
                    createdAt: new Date().toISOString(),
                    id: crypto.randomUUID(),
                    payload: { salesOrderId: state.selectedOrderId },
                    type: "PICK",
                });
                toast.success("Offline. Pick request queued for retry.");
                return;
            }
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
