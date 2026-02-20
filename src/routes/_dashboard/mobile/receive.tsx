import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import { BarcodeScanner } from "@/components/features/mobile/barcode-scanner";
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
import { getWarehouses } from "@/features/inventory/get-warehouses";
import { receiveGoods } from "@/features/inventory/receive-goods";
import { getProducts } from "@/features/products/get-products";

interface ReceivePageState {
    batchNumber: string;
    isSubmitting: boolean;
    productId: string;
    quantity: string;
    unitCost: string;
    warehouseId: string;
}

const receivePageReducer = (
    state: ReceivePageState,
    patch: Partial<ReceivePageState>
): ReceivePageState => ({
    ...state,
    ...patch,
});

export const Route = createFileRoute("/_dashboard/mobile/receive")({
    component: MobileReceivePage,
    loader: async () => {
        const [warehouses, productsPage] = await Promise.all([
            getWarehouses({ data: {} }),
            getProducts({ data: { isActive: true, page: 1, pageSize: 100 } }),
        ]);

        return {
            products: productsPage.products,
            warehouses,
        };
    },
});

function MobileReceivePage() {
    const router = useRouter();
    const { products, warehouses } = Route.useLoaderData();
    const [state, setState] = useReducer(receivePageReducer, {
        batchNumber: "",
        isSubmitting: false,
        productId: products[0]?.id ?? "",
        quantity: "1",
        unitCost: "",
        warehouseId: warehouses[0]?.id ?? "",
    });

    const handleBarcodeDetected = (barcode: string) => {
        const matchedProduct = products.find(
            (product) => product.barcode?.trim() === barcode
        );
        if (!matchedProduct) {
            toast.error("No product found for scanned barcode.");
            return;
        }
        setState({ productId: matchedProduct.id });
        toast.success(`Selected ${matchedProduct.sku} from barcode.`);
    };

    const handleSubmit = async () => {
        const quantity = Number(state.quantity);
        if (!(state.productId && state.warehouseId)) {
            toast.error("Select warehouse and product.");
            return;
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            toast.error("Quantity must be greater than zero.");
            return;
        }

        try {
            setState({ isSubmitting: true });
            await receiveGoods({
                data: {
                    items: [
                        {
                            batchNumber: state.batchNumber || null,
                            expiryDate: null,
                            productId: state.productId,
                            quantity,
                            unitCost:
                                state.unitCost.trim().length > 0
                                    ? Number(state.unitCost)
                                    : null,
                        },
                    ],
                    locationId: null,
                    notes: "Posted via mobile receive",
                    purchaseOrderId: null,
                    warehouseId: state.warehouseId,
                },
            });
            toast.success("Goods received.");
            setState({
                batchNumber: "",
                isSubmitting: false,
                quantity: "1",
                unitCost: "",
            });
            await router.invalidate();
        } catch (error) {
            setState({ isSubmitting: false });
            toast.error(
                error instanceof Error ? error.message : "Receive failed."
            );
        }
    };

    return (
        <Card className="max-w-xl">
            <CardHeader>
                <CardTitle>Mobile Receive</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <BarcodeScanner
                    disabled={state.isSubmitting}
                    onDetected={handleBarcodeDetected}
                />

                <div className="space-y-2">
                    <Label htmlFor="mobile-receive-warehouse">Warehouse</Label>
                    <Select
                        onValueChange={(value) =>
                            setState({ warehouseId: value ?? "" })
                        }
                        value={state.warehouseId}
                    >
                        <SelectTrigger id="mobile-receive-warehouse">
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
                    <Label htmlFor="mobile-receive-product">Product</Label>
                    <Select
                        onValueChange={(value) =>
                            setState({ productId: value ?? "" })
                        }
                        value={state.productId}
                    >
                        <SelectTrigger id="mobile-receive-product">
                            <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                            {products.map((product) => (
                                <SelectItem key={product.id} value={product.id}>
                                    {product.sku} - {product.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <Label htmlFor="mobile-receive-qty">Quantity</Label>
                        <Input
                            id="mobile-receive-qty"
                            inputMode="decimal"
                            min={0.001}
                            onChange={(event) =>
                                setState({ quantity: event.target.value })
                            }
                            step={0.001}
                            type="number"
                            value={state.quantity}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="mobile-receive-unit-cost">
                            Unit Cost
                        </Label>
                        <Input
                            id="mobile-receive-unit-cost"
                            inputMode="numeric"
                            min={0}
                            onChange={(event) =>
                                setState({ unitCost: event.target.value })
                            }
                            type="number"
                            value={state.unitCost}
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="mobile-receive-batch">
                        Batch (optional)
                    </Label>
                    <Input
                        id="mobile-receive-batch"
                        onChange={(event) =>
                            setState({ batchNumber: event.target.value })
                        }
                        placeholder="Batch number"
                        value={state.batchNumber}
                    />
                </div>

                <Button
                    className="min-h-11 w-full"
                    disabled={state.isSubmitting}
                    onClick={() => {
                        handleSubmit().catch(() => undefined);
                    }}
                    type="button"
                >
                    {state.isSubmitting ? "Posting..." : "Post Receipt"}
                </Button>
            </CardContent>
        </Card>
    );
}
