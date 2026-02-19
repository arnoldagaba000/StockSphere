import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
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
import { getProducts } from "@/features/products/get-products";
import { approvePurchaseOrder } from "@/features/purchases/approve-purchase-order";
import { cancelPurchaseOrder } from "@/features/purchases/cancel-purchase-order";
import { createPurchaseOrder } from "@/features/purchases/create-purchase-order";
import { getPurchaseOrderDetail } from "@/features/purchases/get-purchase-order-detail";
import { getPurchaseOrders } from "@/features/purchases/get-purchase-orders";
import { getPurchasingReport } from "@/features/purchases/get-purchasing-report";
import { getSuppliers } from "@/features/purchases/get-suppliers";
import { markPurchaseOrderOrdered } from "@/features/purchases/mark-purchase-order-ordered";
import { rejectPurchaseOrder } from "@/features/purchases/reject-purchase-order";
import { submitPurchaseOrder } from "@/features/purchases/submit-purchase-order";

interface PurchaseOrderFormItem {
    id: string;
    productId: string;
    quantity: string;
    unitPrice: string;
}

const createLineItem = (productId: string): PurchaseOrderFormItem => ({
    id: crypto.randomUUID(),
    productId,
    quantity: "",
    unitPrice: "",
});

type TransitionAction =
    | "approve"
    | "cancel"
    | "markOrdered"
    | "reject"
    | "submit";

export const Route = createFileRoute("/_dashboard/purchase-orders")({
    component: PurchaseOrdersPage,
    loader: async () => {
        const [suppliers, productsResponse, purchaseOrders, report] =
            await Promise.all([
                getSuppliers({ data: {} }),
                getProducts({ data: { pageSize: 200 } }),
                getPurchaseOrders({ data: {} }),
                getPurchasingReport({ data: { days: 30 } }),
            ]);

        return {
            products: productsResponse.products,
            purchaseOrders,
            report,
            suppliers,
        };
    },
});

function PurchaseOrdersPage() {
    const router = useRouter();
    const { products, purchaseOrders, report, suppliers } =
        Route.useLoaderData();

    const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
    const [expectedDate, setExpectedDate] = useState("");
    const [taxAmount, setTaxAmount] = useState("0");
    const [shippingCost, setShippingCost] = useState("0");
    const [items, setItems] = useState<PurchaseOrderFormItem[]>([
        createLineItem(products[0]?.id ?? ""),
    ]);
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrderDetail, setSelectedOrderDetail] = useState<Awaited<
        ReturnType<typeof getPurchaseOrderDetail>
    > | null>(null);
    const [cancelReason, setCancelReason] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isTransitioningId, setIsTransitioningId] = useState<string | null>(
        null
    );
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);

    const subtotal = useMemo(
        () =>
            items.reduce((sum, item) => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                return sum + quantity * unitPrice;
            }, 0),
        [items]
    );
    const total =
        subtotal + (Number(taxAmount) || 0) + (Number(shippingCost) || 0);

    const updateItem = (
        index: number,
        patch: Partial<PurchaseOrderFormItem>
    ): void => {
        setItems((currentItems) =>
            currentItems.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item
            )
        );
    };

    const addLineItem = (): void => {
        setItems((currentItems) => [
            ...currentItems,
            createLineItem(products[0]?.id ?? ""),
        ]);
    };

    const removeLineItem = (index: number): void => {
        setItems((currentItems) => currentItems.filter((_, i) => i !== index));
    };

    const refreshData = async (): Promise<void> => {
        await router.invalidate();
        if (selectedOrderId) {
            await loadPurchaseOrderDetail(selectedOrderId);
        }
    };

    const loadPurchaseOrderDetail = async (purchaseOrderId: string) => {
        try {
            setIsLoadingDetail(true);
            setSelectedOrderId(purchaseOrderId);
            const detail = await getPurchaseOrderDetail({
                data: { purchaseOrderId },
            });
            setSelectedOrderDetail(detail);
            setIsLoadingDetail(false);
        } catch (error) {
            setIsLoadingDetail(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load purchase order detail."
            );
        }
    };

    const handleCreatePurchaseOrder = async () => {
        const normalizedItems = items
            .map((item) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            }))
            .filter((item) => item.productId && item.quantity > 0);

        if (normalizedItems.length === 0) {
            toast.error("Add at least one valid line item.");
            return;
        }
        const expectedDateValue = expectedDate ? new Date(expectedDate) : null;
        const firstProductId = products[0]?.id ?? "";
        const shippingCostValue = Number(shippingCost) || 0;
        const taxAmountValue = Number(taxAmount) || 0;

        try {
            setIsSaving(true);
            await createPurchaseOrder({
                data: {
                    expectedDate: expectedDateValue,
                    items: normalizedItems.map((item) => ({
                        notes: null,
                        productId: item.productId,
                        quantity: item.quantity,
                        taxRate: 0,
                        unitPrice: item.unitPrice,
                    })),
                    notes: null,
                    shippingCost: shippingCostValue,
                    supplierId,
                    taxAmount: taxAmountValue,
                },
            });
            toast.success("Purchase order created.");
            setExpectedDate("");
            setTaxAmount("0");
            setShippingCost("0");
            setItems([createLineItem(firstProductId)]);
            await refreshData();
            setIsSaving(false);
        } catch (error) {
            setIsSaving(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create purchase order."
            );
        }
    };

    const transitionOrder = async (
        purchaseOrderId: string,
        action: TransitionAction
    ) => {
        const reasonValue =
            cancelReason.trim().length > 0 ? cancelReason.trim() : undefined;

        try {
            setIsTransitioningId(purchaseOrderId);
            if (action === "submit") {
                await submitPurchaseOrder({ data: { purchaseOrderId } });
            } else if (action === "approve") {
                await approvePurchaseOrder({ data: { purchaseOrderId } });
            } else if (action === "reject") {
                await rejectPurchaseOrder({ data: { purchaseOrderId } });
            } else if (action === "markOrdered") {
                await markPurchaseOrderOrdered({ data: { purchaseOrderId } });
            } else {
                await cancelPurchaseOrder({
                    data: {
                        purchaseOrderId,
                        reason: reasonValue,
                    },
                });
            }
            toast.success("Purchase order updated.");
            await refreshData();
            setIsTransitioningId(null);
        } catch (error) {
            setIsTransitioningId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update order."
            );
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Purchase Orders</h1>
                <p className="text-muted-foreground text-sm">
                    Purchase lifecycle with supplier analytics and detailed line
                    tracking.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    label="30-Day Spend"
                    value={formatCurrencyFromMinorUnits(report.recentSpend)}
                />
                <MetricCard
                    label="30-Day Orders"
                    value={String(report.recentOrderCount)}
                />
                <MetricCard
                    label="Open POs"
                    value={String(
                        report.statusBreakdown
                            .filter((entry) =>
                                ["DRAFT", "SUBMITTED", "APPROVED"].includes(
                                    entry.status
                                )
                            )
                            .reduce((sum, entry) => sum + entry.count, 0)
                    )}
                />
                <MetricCard
                    label="Received POs"
                    value={String(
                        report.statusBreakdown
                            .filter((entry) =>
                                ["PARTIALLY_RECEIVED", "RECEIVED"].includes(
                                    entry.status
                                )
                            )
                            .reduce((sum, entry) => sum + entry.count, 0)
                    )}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Top Supplier Performance (30 Days)</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Orders</TableHead>
                                <TableHead>Received</TableHead>
                                <TableHead>Open</TableHead>
                                <TableHead className="text-right">
                                    Spend
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {report.supplierPerformance.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell>{supplier.name}</TableCell>
                                    <TableCell>{supplier.orderCount}</TableCell>
                                    <TableCell>
                                        {supplier.receivedOrders}
                                    </TableCell>
                                    <TableCell>{supplier.openOrders}</TableCell>
                                    <TableCell className="text-right">
                                        {formatCurrencyFromMinorUnits(
                                            supplier.totalSpend
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Create Purchase Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Select
                                onValueChange={(value) =>
                                    setSupplierId(value ?? "")
                                }
                                value={supplierId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((supplier) => (
                                        <SelectItem
                                            key={supplier.id}
                                            value={supplier.id}
                                        >
                                            {supplier.code} - {supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expected-date">Expected Date</Label>
                            <Input
                                id="expected-date"
                                onChange={(event) =>
                                    setExpectedDate(event.target.value)
                                }
                                type="date"
                                value={expectedDate}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax-amount">Tax (UGX)</Label>
                            <Input
                                id="tax-amount"
                                onChange={(event) =>
                                    setTaxAmount(event.target.value)
                                }
                                type="number"
                                value={taxAmount}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shipping-cost">
                                Shipping Cost (UGX)
                            </Label>
                            <Input
                                id="shipping-cost"
                                onChange={(event) =>
                                    setShippingCost(event.target.value)
                                }
                                type="number"
                                value={shippingCost}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div
                                className="grid gap-3 md:grid-cols-4"
                                key={item.id}
                            >
                                <Select
                                    onValueChange={(value) =>
                                        updateItem(index, {
                                            productId: value ?? "",
                                        })
                                    }
                                    value={item.productId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((product) => (
                                            <SelectItem
                                                key={product.id}
                                                value={product.id}
                                            >
                                                {product.sku} - {product.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    onChange={(event) =>
                                        updateItem(index, {
                                            quantity: event.target.value,
                                        })
                                    }
                                    placeholder="Quantity"
                                    type="number"
                                    value={item.quantity}
                                />
                                <Input
                                    onChange={(event) =>
                                        updateItem(index, {
                                            unitPrice: event.target.value,
                                        })
                                    }
                                    placeholder="Unit price (UGX)"
                                    type="number"
                                    value={item.unitPrice}
                                />
                                <Button
                                    disabled={items.length <= 1}
                                    onClick={() => removeLineItem(index)}
                                    type="button"
                                    variant="outline"
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={addLineItem}
                            type="button"
                            variant="outline"
                        >
                            Add Line
                        </Button>
                        <p className="text-muted-foreground text-sm">
                            Subtotal: {formatCurrencyFromMinorUnits(subtotal)} |
                            Total: {formatCurrencyFromMinorUnits(total)}
                        </p>
                    </div>

                    <Button
                        disabled={isSaving || !supplierId}
                        onClick={handleCreatePurchaseOrder}
                    >
                        {isSaving ? "Creating..." : "Create Draft"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Purchase Order List</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="mb-3 grid gap-2 md:max-w-md">
                        <Label htmlFor="po-cancel-reason">
                            Cancel Reason (optional)
                        </Label>
                        <Input
                            id="po-cancel-reason"
                            onChange={(event) =>
                                setCancelReason(event.target.value)
                            }
                            placeholder="Reason included in audit trail"
                            value={cancelReason}
                        />
                    </div>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>{order.orderNumber}</TableCell>
                                    <TableCell>{order.supplier.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            order.totalAmount
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                                onClick={() =>
                                                    loadPurchaseOrderDetail(
                                                        order.id
                                                    )
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                View
                                            </Button>
                                            {order.status === "DRAFT" ? (
                                                <Button
                                                    disabled={
                                                        isTransitioningId ===
                                                        order.id
                                                    }
                                                    onClick={() =>
                                                        transitionOrder(
                                                            order.id,
                                                            "submit"
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Submit
                                                </Button>
                                            ) : null}
                                            {order.status === "SUBMITTED" ? (
                                                <>
                                                    <Button
                                                        disabled={
                                                            isTransitioningId ===
                                                            order.id
                                                        }
                                                        onClick={() =>
                                                            transitionOrder(
                                                                order.id,
                                                                "approve"
                                                            )
                                                        }
                                                        size="sm"
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        disabled={
                                                            isTransitioningId ===
                                                            order.id
                                                        }
                                                        onClick={() =>
                                                            transitionOrder(
                                                                order.id,
                                                                "reject"
                                                            )
                                                        }
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            ) : null}
                                            {(order.status === "APPROVED" ||
                                                order.status ===
                                                    "PARTIALLY_RECEIVED") && (
                                                <Button
                                                    disabled={
                                                        isTransitioningId ===
                                                        order.id
                                                    }
                                                    onClick={() =>
                                                        transitionOrder(
                                                            order.id,
                                                            "markOrdered"
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Mark Ordered
                                                </Button>
                                            )}
                                            {[
                                                "DRAFT",
                                                "SUBMITTED",
                                                "APPROVED",
                                            ].includes(order.status) ? (
                                                <Button
                                                    disabled={
                                                        isTransitioningId ===
                                                        order.id
                                                    }
                                                    onClick={() =>
                                                        transitionOrder(
                                                            order.id,
                                                            "cancel"
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    Cancel
                                                </Button>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Purchase Order Detail</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {isLoadingDetail ? (
                        <p className="text-muted-foreground text-sm">
                            Loading detail...
                        </p>
                    ) : null}
                    {selectedOrderDetail || isLoadingDetail ? null : (
                        <p className="text-muted-foreground text-sm">
                            Select an order from the list to inspect item-level
                            progress and receipts.
                        </p>
                    )}
                    {selectedOrderDetail ? (
                        <>
                            <div className="grid gap-2 md:grid-cols-3">
                                <p className="text-sm">
                                    <span className="text-muted-foreground">
                                        Order:
                                    </span>{" "}
                                    {selectedOrderDetail.orderNumber}
                                </p>
                                <p className="text-sm">
                                    <span className="text-muted-foreground">
                                        Supplier:
                                    </span>{" "}
                                    {selectedOrderDetail.supplier.name}
                                </p>
                                <p className="text-sm">
                                    <span className="text-muted-foreground">
                                        Status:
                                    </span>{" "}
                                    {selectedOrderDetail.status}
                                </p>
                            </div>

                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>SKU</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Ordered</TableHead>
                                        <TableHead>Received</TableHead>
                                        <TableHead>Outstanding</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedOrderDetail.items.map((item) => (
                                        <TableRow key={item.id}>
                                            <TableCell>
                                                {item.product.sku}
                                            </TableCell>
                                            <TableCell>
                                                {item.product.name}
                                            </TableCell>
                                            <TableCell>
                                                {item.quantity}
                                            </TableCell>
                                            <TableCell>
                                                {item.receivedQuantity}
                                            </TableCell>
                                            <TableCell>
                                                {Math.max(
                                                    0,
                                                    item.quantity -
                                                        item.receivedQuantity
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>

                            <div className="space-y-1">
                                <p className="font-medium text-sm">Receipts</p>
                                {selectedOrderDetail.receipts.length === 0 ? (
                                    <p className="text-muted-foreground text-sm">
                                        No receipts posted yet.
                                    </p>
                                ) : (
                                    selectedOrderDetail.receipts.map(
                                        (receipt) => (
                                            <p
                                                className="text-sm"
                                                key={receipt.id}
                                            >
                                                {receipt.receiptNumber} •{" "}
                                                {new Date(
                                                    receipt.receivedDate
                                                ).toLocaleDateString()}{" "}
                                                • {receipt.items.length} lines
                                            </p>
                                        )
                                    )
                                )}
                            </div>
                        </>
                    ) : null}
                </CardContent>
            </Card>
        </section>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="font-medium text-sm">{label}</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="font-semibold text-xl">{value}</p>
            </CardContent>
        </Card>
    );
}
