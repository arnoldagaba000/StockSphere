import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import {
    executeMobileOperation,
    type MobileTransferPayload,
} from "@/components/features/mobile/mobile-operations";
import {
    isLikelyNetworkError,
    queueMobileOperation,
} from "@/components/features/mobile/offline-ops-queue";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { getStock } from "@/features/inventory/get-stock";
import { getWarehouses } from "@/features/inventory/get-warehouses";

interface TransferPageState {
    isSubmitting: boolean;
    quantity: string;
    stockItemId: string;
    toWarehouseId: string;
}

const transferPageReducer = (
    state: TransferPageState,
    patch: Partial<TransferPageState>
): TransferPageState => ({
    ...state,
    ...patch,
});

export const Route = createFileRoute("/_dashboard/mobile/transfer")({
    component: MobileTransferPage,
    loader: async () => {
        const [warehouses, stock] = await Promise.all([
            getWarehouses({ data: {} }),
            getStock({ data: { pageSize: 100 } }),
        ]);

        return {
            stockItems: stock.stockItems,
            warehouses,
        };
    },
});

function MobileTransferPage() {
    const router = useRouter();
    const { stockItems, warehouses } = Route.useLoaderData();
    const [state, setState] = useReducer(transferPageReducer, {
        isSubmitting: false,
        quantity: "1",
        stockItemId: stockItems[0]?.id ?? "",
        toWarehouseId: warehouses[0]?.id ?? "",
    });

    const selectedStockItem = stockItems.find(
        (item) => item.id === state.stockItemId
    );

    const handleSubmit = async () => {
        const quantity = Number(state.quantity);
        if (!(state.stockItemId && state.toWarehouseId)) {
            toast.error("Select stock item and destination.");
            return;
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            toast.error("Quantity must be greater than zero.");
            return;
        }
        const operationPayload: MobileTransferPayload = {
            quantity,
            stockItemId: state.stockItemId,
            toWarehouseId: state.toWarehouseId,
        };

        try {
            setState({ isSubmitting: true });
            await executeMobileOperation({
                createdAt: new Date().toISOString(),
                id: crypto.randomUUID(),
                payload: operationPayload,
                type: "TRANSFER",
            });
            toast.success("Stock transferred.");
            setState({
                isSubmitting: false,
                quantity: "1",
            });
            await router.invalidate();
        } catch (error) {
            setState({ isSubmitting: false });
            if (isLikelyNetworkError(error)) {
                queueMobileOperation({
                    createdAt: new Date().toISOString(),
                    id: crypto.randomUUID(),
                    payload: operationPayload,
                    type: "TRANSFER",
                });
                toast.success("Offline. Transfer queued for retry.");
                return;
            }
            toast.error(
                error instanceof Error ? error.message : "Transfer failed."
            );
        }
    };

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <CardTitle>Mobile Transfer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="mobile-transfer-stock">Stock Item</Label>
                    <Select
                        onValueChange={(value) =>
                            setState({ stockItemId: value ?? "" })
                        }
                        value={state.stockItemId}
                    >
                        <SelectTrigger id="mobile-transfer-stock">
                            <SelectValue placeholder="Select stock item" />
                        </SelectTrigger>
                        <SelectContent>
                            {stockItems.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.product.sku} | {item.warehouse.code} |{" "}
                                    avail {item.availableQuantity}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mobile-transfer-to-warehouse">
                        Destination Warehouse
                    </Label>
                    <Select
                        onValueChange={(value) =>
                            setState({ toWarehouseId: value ?? "" })
                        }
                        value={state.toWarehouseId}
                    >
                        <SelectTrigger id="mobile-transfer-to-warehouse">
                            <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            {warehouses.map((warehouse) => (
                                <SelectItem
                                    key={warehouse.id}
                                    value={warehouse.id}
                                >
                                    {warehouse.code} - {warehouse.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mobile-transfer-qty">Quantity</Label>
                    <Input
                        id="mobile-transfer-qty"
                        inputMode="decimal"
                        min={0.001}
                        onChange={(event) =>
                            setState({ quantity: event.target.value })
                        }
                        step={0.001}
                        type="number"
                        value={state.quantity}
                    />
                    {selectedStockItem ? (
                        <p className="text-muted-foreground text-xs">
                            Available: {selectedStockItem.availableQuantity}
                        </p>
                    ) : null}
                </div>

                <Button
                    className="min-h-11 w-full"
                    disabled={state.isSubmitting}
                    onClick={() => {
                        handleSubmit().catch(() => undefined);
                    }}
                    type="button"
                >
                    {state.isSubmitting ? "Transferring..." : "Transfer"}
                </Button>
            </CardContent>
        </Card>
    );
}
