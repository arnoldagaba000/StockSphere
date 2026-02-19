import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useReducer } from "react";
import toast from "react-hot-toast";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getWarehouses } from "@/features/inventory/get-warehouses";
import { getGoodsReceipts } from "@/features/purchases/get-goods-receipts";
import { getPurchaseOrderDetail } from "@/features/purchases/get-purchase-order-detail";
import { getPurchaseOrders } from "@/features/purchases/get-purchase-orders";
import { receiveGoods } from "@/features/purchases/receive-goods";
import { voidGoodsReceipt } from "@/features/purchases/void-goods-receipt";

interface ReceiptLineInput {
    batchNumber: string;
    expiryDate: string;
    productId: string;
    quantity: string;
    serialNumber: string;
}

type ReceiptLineInputMap = Record<string, ReceiptLineInput>;
type PurchaseOrderDetail = Awaited<ReturnType<typeof getPurchaseOrderDetail>>;

const createEmptyLineInput = (
    productId: string,
    quantity: number
): ReceiptLineInput => ({
    batchNumber: "",
    expiryDate: "",
    productId,
    quantity: quantity > 0 ? String(quantity) : "",
    serialNumber: "",
});

interface GoodsReceiptsState {
    isLoadingOrder: boolean;
    isSubmitting: boolean;
    isVoidingId: string | null;
    lineInputs: ReceiptLineInputMap;
    purchaseOrderId: string;
    selectedOrderDetail: PurchaseOrderDetail | null;
    voidReason: string;
    warehouseId: string;
}

type GoodsReceiptsAction =
    | {
          patch: Partial<GoodsReceiptsState>;
          type: "patch";
      }
    | {
          patch: Partial<ReceiptLineInput>;
          productId: string;
          type: "updateLineInput";
      };

const goodsReceiptsReducer = (
    state: GoodsReceiptsState,
    action: GoodsReceiptsAction
): GoodsReceiptsState => {
    if (action.type === "patch") {
        return {
            ...state,
            ...action.patch,
        };
    }

    const currentInput =
        state.lineInputs[action.productId] ??
        createEmptyLineInput(action.productId, 0);

    return {
        ...state,
        lineInputs: {
            ...state.lineInputs,
            [action.productId]: {
                ...currentInput,
                ...action.patch,
            },
        },
    };
};

export const Route = createFileRoute("/_dashboard/goods-receipts")({
    component: GoodsReceiptsPage,
    loader: async () => {
        const [receipts, purchaseOrders, warehouses] = await Promise.all([
            getGoodsReceipts({ data: {} }),
            getPurchaseOrders({ data: {} }),
            getWarehouses({ data: {} }),
        ]);

        return { purchaseOrders, receipts, warehouses };
    },
});

function GoodsReceiptsPage() {
    const router = useRouter();
    const { purchaseOrders, receipts, warehouses } = Route.useLoaderData();

    const receivableOrders = useMemo(
        () =>
            purchaseOrders.filter(
                (order) =>
                    order.status === "APPROVED" ||
                    order.status === "PARTIALLY_RECEIVED"
            ),
        [purchaseOrders]
    );

    const [state, dispatch] = useReducer(goodsReceiptsReducer, {
        isLoadingOrder: false,
        isSubmitting: false,
        isVoidingId: null,
        lineInputs: {},
        purchaseOrderId: receivableOrders[0]?.id ?? "",
        selectedOrderDetail: null,
        voidReason: "",
        warehouseId: warehouses[0]?.id ?? "",
    });
    const {
        isLoadingOrder,
        isSubmitting,
        isVoidingId,
        lineInputs,
        purchaseOrderId,
        selectedOrderDetail,
        voidReason,
        warehouseId,
    } = state;
    const patchState = (patch: Partial<GoodsReceiptsState>) => {
        dispatch({
            patch,
            type: "patch",
        });
    };

    const refresh = async (): Promise<void> => {
        await router.invalidate();
    };

    useEffect(() => {
        if (!purchaseOrderId) {
            return;
        }

        getPurchaseOrderDetail({
            data: { purchaseOrderId },
        })
            .then((detail) => {
                const nextInputs: ReceiptLineInputMap = {};
                for (const item of detail.items) {
                    const outstandingQuantity = Math.max(
                        0,
                        item.quantity - item.receivedQuantity
                    );
                    nextInputs[item.productId] = createEmptyLineInput(
                        item.productId,
                        outstandingQuantity
                    );
                }

                dispatch({
                    patch: {
                        isLoadingOrder: false,
                        lineInputs: nextInputs,
                        selectedOrderDetail: detail,
                    },
                    type: "patch",
                });
            })
            .catch((error) => {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Failed to load purchase order details."
                );
                dispatch({
                    patch: {
                        isLoadingOrder: false,
                        lineInputs: {},
                        selectedOrderDetail: null,
                    },
                    type: "patch",
                });
            });
    }, [purchaseOrderId]);

    const updateLineInput = (
        productId: string,
        patch: Partial<ReceiptLineInput>
    ): void => {
        dispatch({
            patch,
            productId,
            type: "updateLineInput",
        });
    };

    const handleReceive = async () => {
        if (!selectedOrderDetail) {
            toast.error("Select a purchase order first.");
            return;
        }

        const receiptItems = selectedOrderDetail.items
            .map((orderItem) => {
                const input = lineInputs[orderItem.productId];
                const quantity = Number(input?.quantity ?? 0);
                return {
                    batchNumber: input?.batchNumber?.trim() || null,
                    expiryDate: input?.expiryDate
                        ? new Date(input.expiryDate)
                        : null,
                    locationId: null,
                    productId: orderItem.productId,
                    quantity,
                    serialNumber: input?.serialNumber?.trim() || null,
                    warehouseId,
                };
            })
            .filter((item) => item.quantity > 0);

        if (receiptItems.length === 0) {
            toast.error("Enter at least one line quantity greater than zero.");
            return;
        }

        try {
            patchState({ isSubmitting: true });
            await receiveGoods({
                data: {
                    idempotencyKey: crypto.randomUUID(),
                    items: receiptItems,
                    notes: null,
                    purchaseOrderId: selectedOrderDetail.id,
                    receivedDate: new Date(),
                },
            });
            toast.success("Goods receipt posted.");
            await refresh();
            patchState({ isSubmitting: false });
        } catch (error) {
            patchState({ isSubmitting: false });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to receive goods."
            );
        }
    };

    const handleVoidReceipt = async (receiptId: string) => {
        if (voidReason.trim().length < 3) {
            toast.error("Please provide a reason with at least 3 characters.");
            return;
        }

        try {
            patchState({ isVoidingId: receiptId });
            await voidGoodsReceipt({
                data: { goodsReceiptId: receiptId, reason: voidReason.trim() },
            });
            toast.success("Goods receipt voided.");
            await refresh();
            patchState({ isVoidingId: null });
        } catch (error) {
            patchState({ isVoidingId: null });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to void goods receipt."
            );
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Goods Receipts</h1>
                <p className="text-muted-foreground text-sm">
                    Receive at partial line level and reverse posted receipts if
                    required.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Post Goods Receipt</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label>Purchase Order</Label>
                            <Select
                                onValueChange={(value) => {
                                    const nextPurchaseOrderId = value ?? "";
                                    patchState({
                                        purchaseOrderId: nextPurchaseOrderId,
                                    });
                                    if (!nextPurchaseOrderId) {
                                        patchState({
                                            lineInputs: {},
                                            selectedOrderDetail: null,
                                        });
                                    }
                                }}
                                value={purchaseOrderId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select order" />
                                </SelectTrigger>
                                <SelectContent>
                                    {receivableOrders.map((order) => (
                                        <SelectItem
                                            key={order.id}
                                            value={order.id}
                                        >
                                            {order.orderNumber} -{" "}
                                            {order.supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label>Warehouse</Label>
                            <Select
                                onValueChange={(value) =>
                                    patchState({
                                        warehouseId: value ?? "",
                                    })
                                }
                                value={warehouseId}
                            >
                                <SelectTrigger>
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
                    </div>

                    {isLoadingOrder ? (
                        <p className="text-muted-foreground text-sm">
                            Loading order lines...
                        </p>
                    ) : null}

                    {selectedOrderDetail ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Outstanding</TableHead>
                                    <TableHead>Receive Qty</TableHead>
                                    <TableHead>Batch</TableHead>
                                    <TableHead>Serial</TableHead>
                                    <TableHead>Expiry</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {selectedOrderDetail.items.map((item) => {
                                    const outstanding = Math.max(
                                        0,
                                        item.quantity - item.receivedQuantity
                                    );
                                    const input =
                                        lineInputs[item.productId] ??
                                        createEmptyLineInput(
                                            item.productId,
                                            outstanding
                                        );

                                    return (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {item.product.sku}
                                            </TableCell>
                                            <TableCell>{outstanding}</TableCell>
                                            <TableCell>
                                                <Input
                                                    onChange={(event) =>
                                                        updateLineInput(
                                                            item.productId,
                                                            {
                                                                quantity:
                                                                    event.target
                                                                        .value,
                                                            }
                                                        )
                                                    }
                                                    type="number"
                                                    value={input.quantity}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    onChange={(event) =>
                                                        updateLineInput(
                                                            item.productId,
                                                            {
                                                                batchNumber:
                                                                    event.target
                                                                        .value,
                                                            }
                                                        )
                                                    }
                                                    value={input.batchNumber}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    onChange={(event) =>
                                                        updateLineInput(
                                                            item.productId,
                                                            {
                                                                serialNumber:
                                                                    event.target
                                                                        .value,
                                                            }
                                                        )
                                                    }
                                                    value={input.serialNumber}
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Input
                                                    onChange={(event) =>
                                                        updateLineInput(
                                                            item.productId,
                                                            {
                                                                expiryDate:
                                                                    event.target
                                                                        .value,
                                                            }
                                                        )
                                                    }
                                                    type="date"
                                                    value={input.expiryDate}
                                                />
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    ) : null}

                    <Button
                        disabled={
                            isSubmitting || !selectedOrderDetail || !warehouseId
                        }
                        onClick={handleReceive}
                    >
                        {isSubmitting ? "Posting..." : "Post Receipt"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Receipt History</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-3 grid gap-2 md:max-w-md">
                        <Label htmlFor="void-reason">Void Reason</Label>
                        <Input
                            id="void-reason"
                            onChange={(event) =>
                                patchState({
                                    voidReason: event.target.value,
                                })
                            }
                            placeholder="Reason required to reverse a receipt"
                            value={voidReason}
                        />
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Receipt #</TableHead>
                                <TableHead>Purchase Order</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Lines</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {receipts.map((receipt) => (
                                <TableRow key={receipt.id}>
                                    <TableCell>
                                        {receipt.receiptNumber}
                                    </TableCell>
                                    <TableCell>
                                        {receipt.purchaseOrder?.orderNumber ??
                                            "—"}
                                    </TableCell>
                                    <TableCell>
                                        {receipt.purchaseOrder?.supplier.name ??
                                            "—"}
                                    </TableCell>
                                    <TableCell>
                                        {receipt.items.length}
                                    </TableCell>
                                    <TableCell>
                                        {receipt.isVoided ? "Voided" : "Posted"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {receipt.isVoided ? null : (
                                            <Button
                                                disabled={
                                                    isVoidingId === receipt.id
                                                }
                                                onClick={() =>
                                                    handleVoidReceipt(
                                                        receipt.id
                                                    )
                                                }
                                                size="sm"
                                                variant="destructive"
                                            >
                                                Void
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}
