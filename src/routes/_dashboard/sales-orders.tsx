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
import { Textarea } from "@/components/ui/textarea";
import { getCustomers } from "@/features/customers/get-customers";
import { getProducts } from "@/features/products/get-products";
import { cancelSalesOrder } from "@/features/sales/cancel-sales-order";
import { confirmSalesOrder } from "@/features/sales/confirm-sales-order";
import { createSalesOrder } from "@/features/sales/create-sales-order";
import type { SalesOrderDetailResponse } from "@/features/sales/get-sales-order-detail";
import { getSalesOrderDetail } from "@/features/sales/get-sales-order-detail";
import type { SalesOrderListItem } from "@/features/sales/get-sales-orders";
import { getSalesOrders } from "@/features/sales/get-sales-orders";
import { shipOrder } from "@/features/sales/ship-order";

interface SalesOrderLineItemFormState {
    id: string;
    productId: string;
    quantity: string;
    taxRate: string;
    unitPrice: string;
}

interface ShipmentLineFormState {
    orderItemId: string;
    quantity: string;
    stockItemId: string;
}

const createSalesLineItem = (
    productId: string
): SalesOrderLineItemFormState => ({
    id: crypto.randomUUID(),
    productId,
    quantity: "",
    taxRate: "0",
    unitPrice: "",
});

const createShipmentLine = (
    orderItemId: string,
    stockItemId: string,
    quantity: number
): ShipmentLineFormState => ({
    orderItemId,
    quantity: quantity > 0 ? String(quantity) : "",
    stockItemId,
});

export const Route = createFileRoute("/_dashboard/sales-orders")({
    component: SalesOrdersPage,
    loader: async () => {
        const [customers, productsResponse, salesOrders] = await Promise.all([
            getCustomers({ data: { isActive: true } }),
            getProducts({ data: { isActive: true, pageSize: 200 } }),
            getSalesOrders({ data: {} }),
        ]);

        return {
            customers,
            products: productsResponse.products,
            salesOrders,
        };
    },
});

function SalesOrdersPage() {
    const router = useRouter();
    const { customers, products, salesOrders } = Route.useLoaderData();

    const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
    const [requiredDate, setRequiredDate] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [taxAmount, setTaxAmount] = useState("0");
    const [shippingCost, setShippingCost] = useState("0");
    const [items, setItems] = useState<SalesOrderLineItemFormState[]>([
        createSalesLineItem(products[0]?.id ?? ""),
    ]);

    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrderDetail, setSelectedOrderDetail] =
        useState<SalesOrderDetailResponse | null>(null);
    const [shipmentLines, setShipmentLines] = useState<ShipmentLineFormState[]>(
        []
    );
    const [shipmentCarrier, setShipmentCarrier] = useState("");
    const [shipmentTrackingNumber, setShipmentTrackingNumber] = useState("");
    const [cancelReason, setCancelReason] = useState("");

    const [isCreating, setIsCreating] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isActionBusyId, setIsActionBusyId] = useState<string | null>(null);
    const [isShipping, setIsShipping] = useState(false);

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

    const updateLineItem = (
        index: number,
        patch: Partial<SalesOrderLineItemFormState>
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
            createSalesLineItem(products[0]?.id ?? ""),
        ]);
    };

    const removeLineItem = (index: number): void => {
        setItems((currentItems) =>
            currentItems.filter((_, itemIndex) => itemIndex !== index)
        );
    };

    const resetCreateForm = (): void => {
        setRequiredDate("");
        setShippingAddress("");
        setTaxAmount("0");
        setShippingCost("0");
        setItems([createSalesLineItem(products[0]?.id ?? "")]);
    };

    const refresh = async (): Promise<void> => {
        await router.invalidate();
        if (selectedOrderId) {
            await loadOrderDetail(selectedOrderId);
        }
    };

    const buildDefaultShipmentLines = (
        detail: SalesOrderDetailResponse
    ): ShipmentLineFormState[] => {
        return detail.items
            .map((item) => {
                const remainingQuantity = item.quantity - item.shippedQuantity;
                const bucket = detail.stockBuckets.find(
                    (stockBucket) =>
                        stockBucket.productId === item.productId &&
                        stockBucket.availableQuantity > 0
                );

                return createShipmentLine(
                    item.id,
                    bucket?.id ?? "",
                    Math.max(0, remainingQuantity)
                );
            })
            .filter((line) => line.stockItemId.length > 0);
    };

    const loadOrderDetail = async (orderId: string): Promise<void> => {
        try {
            setIsLoadingDetail(true);
            setSelectedOrderId(orderId);
            const detail = (await getSalesOrderDetail({
                data: { salesOrderId: orderId },
            })) as SalesOrderDetailResponse;
            setSelectedOrderDetail(detail);
            setShipmentLines(buildDefaultShipmentLines(detail));
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load sales order detail."
            );
        } finally {
            setIsLoadingDetail(false);
        }
    };

    const handleCreateSalesOrder = async (): Promise<void> => {
        const normalizedItems = items
            .map((item) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                taxRate: Number(item.taxRate) || 0,
                unitPrice: Number(item.unitPrice),
            }))
            .filter(
                (item) =>
                    item.productId.length > 0 &&
                    item.quantity > 0 &&
                    item.unitPrice >= 0
            );

        if (!customerId) {
            toast.error("Select a customer.");
            return;
        }
        if (normalizedItems.length === 0) {
            toast.error("Add at least one valid order line.");
            return;
        }

        try {
            setIsCreating(true);
            await createSalesOrder({
                data: {
                    customerId,
                    items: normalizedItems.map((item) => ({
                        discountPercent: 0,
                        notes: null,
                        productId: item.productId,
                        quantity: item.quantity,
                        taxRate: item.taxRate,
                        unitPrice: item.unitPrice,
                    })),
                    notes: null,
                    requiredDate: requiredDate ? new Date(requiredDate) : null,
                    shippingAddress: shippingAddress.trim() || null,
                    shippingCost: Number(shippingCost) || 0,
                    taxAmount: Number(taxAmount) || 0,
                },
            });
            toast.success("Sales order created.");
            resetCreateForm();
            await refresh();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create sales order."
            );
        } finally {
            setIsCreating(false);
        }
    };

    const handleConfirmOrder = async (orderId: string): Promise<void> => {
        try {
            setIsActionBusyId(orderId);
            await confirmSalesOrder({ data: { salesOrderId: orderId } });
            toast.success("Sales order confirmed.");
            await refresh();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to confirm sales order."
            );
        } finally {
            setIsActionBusyId(null);
        }
    };

    const handleCancelOrder = async (orderId: string): Promise<void> => {
        if (cancelReason.trim().length === 0) {
            toast.error("Enter a cancellation reason.");
            return;
        }

        try {
            setIsActionBusyId(orderId);
            await cancelSalesOrder({
                data: {
                    reason: cancelReason.trim(),
                    salesOrderId: orderId,
                },
            });
            toast.success("Sales order cancelled.");
            setCancelReason("");
            await refresh();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to cancel sales order."
            );
        } finally {
            setIsActionBusyId(null);
        }
    };

    const updateShipmentLine = (
        orderItemId: string,
        patch: Partial<ShipmentLineFormState>
    ): void => {
        setShipmentLines((currentLines) =>
            currentLines.map((line) =>
                line.orderItemId === orderItemId ? { ...line, ...patch } : line
            )
        );
    };

    const handleShipOrder = async (): Promise<void> => {
        if (!selectedOrderDetail) {
            return;
        }

        const payloadItems = shipmentLines
            .map((line) => {
                const orderItem = selectedOrderDetail.items.find(
                    (item) => item.id === line.orderItemId
                );

                return {
                    quantity: Number(line.quantity) || 0,
                    salesOrderItemId: line.orderItemId,
                    stockItemId: line.stockItemId,
                    valid: Boolean(orderItem),
                };
            })
            .filter(
                (line) =>
                    line.valid &&
                    line.salesOrderItemId.length > 0 &&
                    line.stockItemId.length > 0 &&
                    line.quantity > 0
            );

        if (payloadItems.length === 0) {
            toast.error("Select at least one shipment line with quantity.");
            return;
        }

        try {
            setIsShipping(true);
            await shipOrder({
                data: {
                    carrier: shipmentCarrier.trim() || null,
                    items: payloadItems.map((line) => ({
                        quantity: line.quantity,
                        salesOrderItemId: line.salesOrderItemId,
                        stockItemId: line.stockItemId,
                    })),
                    notes: null,
                    salesOrderId: selectedOrderDetail.id,
                    shippedDate: new Date(),
                    trackingNumber: shipmentTrackingNumber.trim() || null,
                },
            });
            toast.success("Shipment posted.");
            setShipmentCarrier("");
            setShipmentTrackingNumber("");
            await refresh();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to post shipment."
            );
        } finally {
            setIsShipping(false);
        }
    };

    const onCreateSalesOrderClick = () => {
        handleCreateSalesOrder().catch(() => undefined);
    };

    const onLoadOrderDetailClick = (orderId: string) => () => {
        loadOrderDetail(orderId).catch(() => undefined);
    };

    const onConfirmOrderClick = (orderId: string) => () => {
        handleConfirmOrder(orderId).catch(() => undefined);
    };

    const onCancelOrderClick = (orderId: string) => () => {
        handleCancelOrder(orderId).catch(() => undefined);
    };

    const onShipOrderClick = () => {
        handleShipOrder().catch(() => undefined);
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Sales Orders</h1>
                <p className="text-muted-foreground text-sm">
                    Draft, confirm, and fulfill customer orders with stock-aware
                    shipment posting.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create Sales Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <Select
                                onValueChange={(value) =>
                                    setCustomerId(value ?? "")
                                }
                                value={customerId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map((customer) => (
                                        <SelectItem
                                            key={customer.id}
                                            value={customer.id}
                                        >
                                            {customer.name} ({customer.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="required-date">Required Date</Label>
                            <Input
                                id="required-date"
                                onChange={(event) =>
                                    setRequiredDate(event.target.value)
                                }
                                type="date"
                                value={requiredDate}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax-amount">Tax (UGX)</Label>
                            <Input
                                id="tax-amount"
                                min={0}
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
                                min={0}
                                onChange={(event) =>
                                    setShippingCost(event.target.value)
                                }
                                type="number"
                                value={shippingCost}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="shipping-address">
                            Shipping Address
                        </Label>
                        <Textarea
                            id="shipping-address"
                            onChange={(event) =>
                                setShippingAddress(event.target.value)
                            }
                            placeholder="Optional delivery address"
                            value={shippingAddress}
                        />
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div
                                className="grid gap-2 md:grid-cols-5"
                                key={item.id}
                            >
                                <Select
                                    onValueChange={(value) =>
                                        updateLineItem(index, {
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
                                                {product.name} ({product.sku})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    min={0}
                                    onChange={(event) =>
                                        updateLineItem(index, {
                                            quantity: event.target.value,
                                        })
                                    }
                                    placeholder="Qty"
                                    type="number"
                                    value={item.quantity}
                                />
                                <Input
                                    min={0}
                                    onChange={(event) =>
                                        updateLineItem(index, {
                                            unitPrice: event.target.value,
                                        })
                                    }
                                    placeholder="Unit Price (UGX)"
                                    type="number"
                                    value={item.unitPrice}
                                />
                                <Input
                                    max={100}
                                    min={0}
                                    onChange={(event) =>
                                        updateLineItem(index, {
                                            taxRate: event.target.value,
                                        })
                                    }
                                    placeholder="Tax %"
                                    type="number"
                                    value={item.taxRate}
                                />
                                <Button
                                    disabled={items.length === 1}
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
                        <Button
                            disabled={isCreating || !customerId}
                            onClick={onCreateSalesOrderClick}
                            type="button"
                        >
                            {isCreating ? "Saving..." : "Create Draft"}
                        </Button>
                        <span className="text-muted-foreground text-sm">
                            Subtotal: {formatCurrencyFromMinorUnits(subtotal)} |
                            Total: {formatCurrencyFromMinorUnits(total)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sales Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="cancel-reason">
                            Cancellation Reason
                        </Label>
                        <Input
                            id="cancel-reason"
                            onChange={(event) =>
                                setCancelReason(event.target.value)
                            }
                            placeholder="Required when cancelling"
                            value={cancelReason}
                        />
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Total
                                </TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salesOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={5}
                                    >
                                        No sales orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                salesOrders.map((order: SalesOrderListItem) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            {order.orderNumber}
                                        </TableCell>
                                        <TableCell>
                                            {order.customer.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrencyFromMinorUnits(
                                                order.totalAmount
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    onClick={onLoadOrderDetailClick(
                                                        order.id
                                                    )}
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    View
                                                </Button>
                                                {order.status === "DRAFT" ? (
                                                    <Button
                                                        disabled={
                                                            isActionBusyId ===
                                                            order.id
                                                        }
                                                        onClick={onConfirmOrderClick(
                                                            order.id
                                                        )}
                                                        size="sm"
                                                        type="button"
                                                    >
                                                        Confirm
                                                    </Button>
                                                ) : null}
                                                {[
                                                    "DRAFT",
                                                    "CONFIRMED",
                                                ].includes(order.status) ? (
                                                    <Button
                                                        disabled={
                                                            isActionBusyId ===
                                                            order.id
                                                        }
                                                        onClick={onCancelOrderClick(
                                                            order.id
                                                        )}
                                                        size="sm"
                                                        type="button"
                                                        variant="destructive"
                                                    >
                                                        Cancel
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {selectedOrderDetail ? (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Order Detail - {selectedOrderDetail.orderNumber}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingDetail ? (
                            <p className="text-muted-foreground text-sm">
                                Loading detail...
                            </p>
                        ) : (
                            <>
                                <div className="text-sm">
                                    <p>
                                        Customer:{" "}
                                        {selectedOrderDetail.customer.name} ({" "}
                                        {selectedOrderDetail.customer.code})
                                    </p>
                                    <p className="text-muted-foreground">
                                        Status: {selectedOrderDetail.status}
                                    </p>
                                </div>

                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>SKU</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-right">
                                                Qty
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Shipped
                                            </TableHead>
                                            <TableHead className="text-right">
                                                Remaining
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {selectedOrderDetail.items.map(
                                            (item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        {item.product.sku}
                                                    </TableCell>
                                                    <TableCell>
                                                        {item.product.name}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.quantity}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {item.shippedQuantity}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {Math.max(
                                                            0,
                                                            item.quantity -
                                                                item.shippedQuantity
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        )}
                                    </TableBody>
                                </Table>

                                {["CONFIRMED", "PARTIALLY_FULFILLED"].includes(
                                    selectedOrderDetail.status
                                ) ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Create Shipment
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <div className="space-y-2">
                                                    <Label htmlFor="shipment-carrier">
                                                        Carrier
                                                    </Label>
                                                    <Input
                                                        id="shipment-carrier"
                                                        onChange={(event) =>
                                                            setShipmentCarrier(
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        value={shipmentCarrier}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label htmlFor="shipment-tracking">
                                                        Tracking Number
                                                    </Label>
                                                    <Input
                                                        id="shipment-tracking"
                                                        onChange={(event) =>
                                                            setShipmentTrackingNumber(
                                                                event.target
                                                                    .value
                                                            )
                                                        }
                                                        value={
                                                            shipmentTrackingNumber
                                                        }
                                                    />
                                                </div>
                                            </div>

                                            {shipmentLines.map((line) => {
                                                const orderItem =
                                                    selectedOrderDetail.items.find(
                                                        (item) =>
                                                            item.id ===
                                                            line.orderItemId
                                                    );
                                                if (!orderItem) {
                                                    return null;
                                                }

                                                const bucketOptions =
                                                    selectedOrderDetail.stockBuckets.filter(
                                                        (bucket) =>
                                                            bucket.productId ===
                                                                orderItem.productId &&
                                                            bucket.availableQuantity >
                                                                0
                                                    );

                                                return (
                                                    <div
                                                        className="grid gap-2 md:grid-cols-4"
                                                        key={line.orderItemId}
                                                    >
                                                        <div className="md:col-span-2">
                                                            <p className="font-medium text-sm">
                                                                {
                                                                    orderItem
                                                                        .product
                                                                        .name
                                                                }
                                                            </p>
                                                            <p className="text-muted-foreground text-xs">
                                                                Remaining:{" "}
                                                                {Math.max(
                                                                    0,
                                                                    orderItem.quantity -
                                                                        orderItem.shippedQuantity
                                                                )}
                                                            </p>
                                                        </div>
                                                        <Select
                                                            onValueChange={(
                                                                value
                                                            ) =>
                                                                updateShipmentLine(
                                                                    line.orderItemId,
                                                                    {
                                                                        stockItemId:
                                                                            value ??
                                                                            "",
                                                                    }
                                                                )
                                                            }
                                                            value={
                                                                line.stockItemId
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Stock bucket" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {bucketOptions.map(
                                                                    (
                                                                        bucket
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                bucket.id
                                                                            }
                                                                            value={
                                                                                bucket.id
                                                                            }
                                                                        >
                                                                            {
                                                                                bucket
                                                                                    .warehouse
                                                                                    .code
                                                                            }
                                                                            {bucket.location
                                                                                ? ` / ${bucket.location.code}`
                                                                                : ""}
                                                                            {` - Available ${bucket.availableQuantity}`}
                                                                        </SelectItem>
                                                                    )
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <Input
                                                            min={0}
                                                            onChange={(event) =>
                                                                updateShipmentLine(
                                                                    line.orderItemId,
                                                                    {
                                                                        quantity:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    }
                                                                )
                                                            }
                                                            placeholder="Qty"
                                                            type="number"
                                                            value={
                                                                line.quantity
                                                            }
                                                        />
                                                    </div>
                                                );
                                            })}

                                            <Button
                                                disabled={isShipping}
                                                onClick={onShipOrderClick}
                                                type="button"
                                            >
                                                {isShipping
                                                    ? "Posting shipment..."
                                                    : "Post Shipment"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : null}
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : null}
        </section>
    );
}
