import { createFileRoute } from "@tanstack/react-router";
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
import { deleteSalesOrderDraft } from "@/features/sales/delete-sales-order-draft";
import type { SalesOrderDetailResponse } from "@/features/sales/get-sales-order-detail";
import { getSalesOrderDetail } from "@/features/sales/get-sales-order-detail";
import type {
    SalesOrderListItem,
    SalesOrdersListResponse,
} from "@/features/sales/get-sales-orders";
import { getSalesOrders } from "@/features/sales/get-sales-orders";
import { markSalesOrderDelivered } from "@/features/sales/mark-sales-order-delivered";
import { shipOrder } from "@/features/sales/ship-order";
import { updateSalesOrderDraft } from "@/features/sales/update-sales-order-draft";

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

interface SalesListFilters {
    customerId: string;
    dateFrom: string;
    dateTo: string;
    search: string;
    status: string;
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

const emptyFilters: SalesListFilters = {
    customerId: "",
    dateFrom: "",
    dateTo: "",
    search: "",
    status: "",
};

const buildSalesOrdersQuery = (
    filters: SalesListFilters,
    page: number
): Parameters<typeof getSalesOrders>[0] => ({
    data: {
        customerId: filters.customerId || undefined,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        page,
        pageSize: 20,
        search: filters.search.trim() || undefined,
        status:
            filters.status.length > 0
                ? (filters.status as
                      | "CANCELLED"
                      | "CONFIRMED"
                      | "DELIVERED"
                      | "DRAFT"
                      | "FULFILLED"
                      | "PARTIALLY_FULFILLED"
                      | "SHIPPED")
                : undefined,
    },
});

export const Route = createFileRoute("/_dashboard/sales-orders")({
    component: SalesOrdersPage,
    loader: async () => {
        const [customers, productsResponse, initialSalesOrders] =
            await Promise.all([
                getCustomers({ data: { isActive: true } }),
                getProducts({ data: { isActive: true, pageSize: 200 } }),
                getSalesOrders(buildSalesOrdersQuery(emptyFilters, 1)),
            ]);

        return {
            customers,
            initialSalesOrders,
            products: productsResponse.products,
        };
    },
});

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: page coordinates multiple workflows (create/filter/detail/shipment) in one route component.
function SalesOrdersPage() {
    const { customers, initialSalesOrders, products } = Route.useLoaderData();

    const [customerId, setCustomerId] = useState(customers[0]?.id ?? "");
    const [requiredDate, setRequiredDate] = useState("");
    const [shippingAddress, setShippingAddress] = useState("");
    const [taxAmount, setTaxAmount] = useState("0");
    const [shippingCost, setShippingCost] = useState("0");
    const [items, setItems] = useState<SalesOrderLineItemFormState[]>([
        createSalesLineItem(products[0]?.id ?? ""),
    ]);

    const [listFilters, setListFilters] =
        useState<SalesListFilters>(emptyFilters);
    const [salesOrdersResponse, setSalesOrdersResponse] =
        useState<SalesOrdersListResponse>(initialSalesOrders);
    const [isLoadingOrders, setIsLoadingOrders] = useState(false);

    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [selectedOrderDetail, setSelectedOrderDetail] =
        useState<SalesOrderDetailResponse | null>(null);
    const [shipmentLines, setShipmentLines] = useState<ShipmentLineFormState[]>(
        []
    );
    const [shipmentCarrier, setShipmentCarrier] = useState("");
    const [shipmentTrackingNumber, setShipmentTrackingNumber] = useState("");
    const [cancelReason, setCancelReason] = useState("");

    const [draftNotes, setDraftNotes] = useState("");
    const [draftRequiredDate, setDraftRequiredDate] = useState("");
    const [draftShippingAddress, setDraftShippingAddress] = useState("");
    const [draftTaxAmount, setDraftTaxAmount] = useState("0");
    const [draftShippingCost, setDraftShippingCost] = useState("0");
    const [draftLines, setDraftLines] = useState<SalesOrderLineItemFormState[]>(
        []
    );

    const [isCreating, setIsCreating] = useState(false);
    const [isLoadingDetail, setIsLoadingDetail] = useState(false);
    const [isActionBusyId, setIsActionBusyId] = useState<string | null>(null);
    const [isShipping, setIsShipping] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);

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

    const setDraftFromDetail = (detail: SalesOrderDetailResponse) => {
        setDraftNotes(detail.notes ?? "");
        setDraftRequiredDate(
            detail.requiredDate
                ? new Date(detail.requiredDate).toISOString().slice(0, 10)
                : ""
        );
        setDraftShippingAddress(detail.shippingAddress ?? "");
        setDraftTaxAmount(String(detail.taxAmount));
        setDraftShippingCost(String(detail.shippingCost));
        setDraftLines(
            detail.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                quantity: String(item.quantity),
                taxRate: String(item.taxRate),
                unitPrice: String(item.unitPrice),
            }))
        );
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
            if (detail.status === "DRAFT") {
                setDraftFromDetail(detail);
            }
            setIsLoadingDetail(false);
        } catch (error) {
            setIsLoadingDetail(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load sales order detail."
            );
        }
    };

    const loadSalesOrders = async (page = 1): Promise<void> => {
        try {
            setIsLoadingOrders(true);
            const response = await getSalesOrders(
                buildSalesOrdersQuery(listFilters, page)
            );
            setSalesOrdersResponse(response);
            setIsLoadingOrders(false);
        } catch (error) {
            setIsLoadingOrders(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load sales orders."
            );
        }
    };

    const refresh = async (): Promise<void> => {
        await loadSalesOrders(salesOrdersResponse.pagination.page);
        if (selectedOrderId) {
            await loadOrderDetail(selectedOrderId);
        }
    };

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
        const requiredDateValue = requiredDate ? new Date(requiredDate) : null;
        const shippingAddressValue = shippingAddress.trim() || null;
        const shippingCostValue = Number(shippingCost) || 0;
        const taxAmountValue = Number(taxAmount) || 0;

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
                    requiredDate: requiredDateValue,
                    shippingAddress: shippingAddressValue,
                    shippingCost: shippingCostValue,
                    taxAmount: taxAmountValue,
                },
            });
            toast.success("Sales order created.");
            resetCreateForm();
            await refresh();
            setIsCreating(false);
        } catch (error) {
            setIsCreating(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create sales order."
            );
        }
    };

    const handleConfirmOrder = async (orderId: string): Promise<void> => {
        try {
            setIsActionBusyId(orderId);
            await confirmSalesOrder({ data: { salesOrderId: orderId } });
            toast.success("Sales order confirmed.");
            await refresh();
            setIsActionBusyId(null);
        } catch (error) {
            setIsActionBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to confirm sales order."
            );
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
            setIsActionBusyId(null);
        } catch (error) {
            setIsActionBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to cancel sales order."
            );
        }
    };

    const handleDeleteDraft = async (orderId: string): Promise<void> => {
        try {
            setIsActionBusyId(orderId);
            await deleteSalesOrderDraft({ data: { salesOrderId: orderId } });
            toast.success("Draft sales order deleted.");
            if (selectedOrderId === orderId) {
                setSelectedOrderId(null);
                setSelectedOrderDetail(null);
            }
            await refresh();
            setIsActionBusyId(null);
        } catch (error) {
            setIsActionBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete draft sales order."
            );
        }
    };

    const handleMarkDelivered = async (orderId: string): Promise<void> => {
        try {
            setIsActionBusyId(orderId);
            await markSalesOrderDelivered({ data: { salesOrderId: orderId } });
            toast.success("Order marked delivered.");
            await refresh();
            setIsActionBusyId(null);
        } catch (error) {
            setIsActionBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to mark order delivered."
            );
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
            .map((line) => ({
                quantity: Number(line.quantity) || 0,
                salesOrderItemId: line.orderItemId,
                stockItemId: line.stockItemId,
            }))
            .filter(
                (line) =>
                    line.salesOrderItemId.length > 0 &&
                    line.stockItemId.length > 0 &&
                    line.quantity > 0
            );

        if (payloadItems.length === 0) {
            toast.error("Select at least one shipment line with quantity.");
            return;
        }
        const carrierValue = shipmentCarrier.trim() || null;
        const trackingNumberValue = shipmentTrackingNumber.trim() || null;

        try {
            setIsShipping(true);
            await shipOrder({
                data: {
                    carrier: carrierValue,
                    items: payloadItems,
                    notes: null,
                    salesOrderId: selectedOrderDetail.id,
                    shippedDate: new Date(),
                    trackingNumber: trackingNumberValue,
                },
            });
            toast.success("Shipment posted.");
            setShipmentCarrier("");
            setShipmentTrackingNumber("");
            await refresh();
            setIsShipping(false);
        } catch (error) {
            setIsShipping(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to post shipment."
            );
        }
    };

    const handleSaveDraft = async (): Promise<void> => {
        if (!selectedOrderDetail || selectedOrderDetail.status !== "DRAFT") {
            return;
        }

        const normalizedLines = draftLines
            .map((line) => ({
                notes: null,
                productId: line.productId,
                quantity: Number(line.quantity),
                taxRate: Number(line.taxRate) || 0,
                unitPrice: Number(line.unitPrice),
            }))
            .filter(
                (line) =>
                    line.productId.length > 0 &&
                    line.quantity > 0 &&
                    line.unitPrice >= 0
            );

        if (normalizedLines.length === 0) {
            toast.error("Draft needs at least one valid line.");
            return;
        }

        try {
            setIsSavingDraft(true);
            await updateSalesOrderDraft({
                data: {
                    items: normalizedLines,
                    notes: draftNotes.trim() || null,
                    requiredDate: draftRequiredDate
                        ? new Date(draftRequiredDate)
                        : null,
                    salesOrderId: selectedOrderDetail.id,
                    shippingAddress: draftShippingAddress.trim() || null,
                    shippingCost: Number(draftShippingCost) || 0,
                    taxAmount: Number(draftTaxAmount) || 0,
                },
            });
            toast.success("Draft updated.");
            await refresh();
            setIsSavingDraft(false);
        } catch (error) {
            setIsSavingDraft(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update draft."
            );
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

    const onDeleteDraftClick = (orderId: string) => () => {
        handleDeleteDraft(orderId).catch(() => undefined);
    };

    const onMarkDeliveredClick = (orderId: string) => () => {
        handleMarkDelivered(orderId).catch(() => undefined);
    };

    const onShipOrderClick = () => {
        handleShipOrder().catch(() => undefined);
    };

    const salesOrders: SalesOrderListItem[] = salesOrdersResponse.orders;

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Sales Orders</h1>
                <p className="text-muted-foreground text-sm">
                    Draft, confirm, ship, and deliver customer orders.
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
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        <Input
                            onChange={(event) =>
                                setListFilters((current) => ({
                                    ...current,
                                    search: event.target.value,
                                }))
                            }
                            placeholder="Search order/customer"
                            value={listFilters.search}
                        />
                        <Select
                            onValueChange={(value) =>
                                setListFilters((current) => ({
                                    ...current,
                                    status: value ?? "",
                                }))
                            }
                            value={listFilters.status || null}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Statuses</SelectItem>
                                <SelectItem value="DRAFT">DRAFT</SelectItem>
                                <SelectItem value="CONFIRMED">
                                    CONFIRMED
                                </SelectItem>
                                <SelectItem value="PARTIALLY_FULFILLED">
                                    PARTIALLY_FULFILLED
                                </SelectItem>
                                <SelectItem value="FULFILLED">
                                    FULFILLED
                                </SelectItem>
                                <SelectItem value="SHIPPED">SHIPPED</SelectItem>
                                <SelectItem value="DELIVERED">
                                    DELIVERED
                                </SelectItem>
                                <SelectItem value="CANCELLED">
                                    CANCELLED
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            onValueChange={(value) =>
                                setListFilters((current) => ({
                                    ...current,
                                    customerId: value ?? "",
                                }))
                            }
                            value={listFilters.customerId || null}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Customer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Customers</SelectItem>
                                {customers.map((customer) => (
                                    <SelectItem
                                        key={customer.id}
                                        value={customer.id}
                                    >
                                        {customer.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Input
                            onChange={(event) =>
                                setListFilters((current) => ({
                                    ...current,
                                    dateFrom: event.target.value,
                                }))
                            }
                            type="date"
                            value={listFilters.dateFrom}
                        />
                        <Input
                            onChange={(event) =>
                                setListFilters((current) => ({
                                    ...current,
                                    dateTo: event.target.value,
                                }))
                            }
                            type="date"
                            value={listFilters.dateTo}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            disabled={isLoadingOrders}
                            onClick={() => {
                                loadSalesOrders(1).catch(() => undefined);
                            }}
                            type="button"
                            variant="outline"
                        >
                            {isLoadingOrders ? "Loading..." : "Apply Filters"}
                        </Button>
                        <span className="text-muted-foreground text-sm">
                            Page {salesOrdersResponse.pagination.page} of{" "}
                            {salesOrdersResponse.pagination.totalPages} ({" "}
                            {salesOrdersResponse.pagination.total} orders)
                        </span>
                    </div>

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
                                                {order.status === "DRAFT" ? (
                                                    <Button
                                                        disabled={
                                                            isActionBusyId ===
                                                            order.id
                                                        }
                                                        onClick={onDeleteDraftClick(
                                                            order.id
                                                        )}
                                                        size="sm"
                                                        type="button"
                                                        variant="outline"
                                                    >
                                                        Delete Draft
                                                    </Button>
                                                ) : null}
                                                {[
                                                    "SHIPPED",
                                                    "FULFILLED",
                                                ].includes(order.status) ? (
                                                    <Button
                                                        disabled={
                                                            isActionBusyId ===
                                                            order.id
                                                        }
                                                        onClick={onMarkDeliveredClick(
                                                            order.id
                                                        )}
                                                        size="sm"
                                                        type="button"
                                                        variant="outline"
                                                    >
                                                        Mark Delivered
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            disabled={
                                isLoadingOrders ||
                                salesOrdersResponse.pagination.page <= 1
                            }
                            onClick={() => {
                                loadSalesOrders(
                                    salesOrdersResponse.pagination.page - 1
                                ).catch(() => undefined);
                            }}
                            type="button"
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <Button
                            disabled={
                                isLoadingOrders ||
                                salesOrdersResponse.pagination.page >=
                                    salesOrdersResponse.pagination.totalPages
                            }
                            onClick={() => {
                                loadSalesOrders(
                                    salesOrdersResponse.pagination.page + 1
                                ).catch(() => undefined);
                            }}
                            type="button"
                            variant="outline"
                        >
                            Next
                        </Button>
                    </div>
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
                                        {selectedOrderDetail.customer.name} (
                                        {selectedOrderDetail.customer.code})
                                    </p>
                                    <p className="text-muted-foreground">
                                        Status: {selectedOrderDetail.status}
                                    </p>
                                </div>

                                {selectedOrderDetail.status === "DRAFT" ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Edit Draft</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                                <Input
                                                    onChange={(event) =>
                                                        setDraftRequiredDate(
                                                            event.target.value
                                                        )
                                                    }
                                                    type="date"
                                                    value={draftRequiredDate}
                                                />
                                                <Input
                                                    min={0}
                                                    onChange={(event) =>
                                                        setDraftTaxAmount(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Tax (UGX)"
                                                    type="number"
                                                    value={draftTaxAmount}
                                                />
                                                <Input
                                                    min={0}
                                                    onChange={(event) =>
                                                        setDraftShippingCost(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Shipping (UGX)"
                                                    type="number"
                                                    value={draftShippingCost}
                                                />
                                                <Input
                                                    onChange={(event) =>
                                                        setDraftShippingAddress(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Shipping Address"
                                                    value={draftShippingAddress}
                                                />
                                            </div>
                                            <Textarea
                                                onChange={(event) =>
                                                    setDraftNotes(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Order notes"
                                                value={draftNotes}
                                            />

                                            {draftLines.map((line, index) => (
                                                <div
                                                    className="grid gap-2 md:grid-cols-4"
                                                    key={line.id}
                                                >
                                                    <Select
                                                        onValueChange={(
                                                            value
                                                        ) =>
                                                            setDraftLines(
                                                                (current) =>
                                                                    current.map(
                                                                        (
                                                                            currentLine,
                                                                            currentIndex
                                                                        ) =>
                                                                            currentIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...currentLine,
                                                                                      productId:
                                                                                          value ??
                                                                                          "",
                                                                                  }
                                                                                : currentLine
                                                                    )
                                                            )
                                                        }
                                                        value={line.productId}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Product" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {products.map(
                                                                (product) => (
                                                                    <SelectItem
                                                                        key={
                                                                            product.id
                                                                        }
                                                                        value={
                                                                            product.id
                                                                        }
                                                                    >
                                                                        {
                                                                            product.name
                                                                        }
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        min={0}
                                                        onChange={(event) =>
                                                            setDraftLines(
                                                                (current) =>
                                                                    current.map(
                                                                        (
                                                                            currentLine,
                                                                            currentIndex
                                                                        ) =>
                                                                            currentIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...currentLine,
                                                                                      quantity:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : currentLine
                                                                    )
                                                            )
                                                        }
                                                        placeholder="Qty"
                                                        type="number"
                                                        value={line.quantity}
                                                    />
                                                    <Input
                                                        min={0}
                                                        onChange={(event) =>
                                                            setDraftLines(
                                                                (current) =>
                                                                    current.map(
                                                                        (
                                                                            currentLine,
                                                                            currentIndex
                                                                        ) =>
                                                                            currentIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...currentLine,
                                                                                      unitPrice:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : currentLine
                                                                    )
                                                            )
                                                        }
                                                        placeholder="Unit Price"
                                                        type="number"
                                                        value={line.unitPrice}
                                                    />
                                                    <Input
                                                        max={100}
                                                        min={0}
                                                        onChange={(event) =>
                                                            setDraftLines(
                                                                (current) =>
                                                                    current.map(
                                                                        (
                                                                            currentLine,
                                                                            currentIndex
                                                                        ) =>
                                                                            currentIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...currentLine,
                                                                                      taxRate:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : currentLine
                                                                    )
                                                            )
                                                        }
                                                        placeholder="Tax %"
                                                        type="number"
                                                        value={line.taxRate}
                                                    />
                                                </div>
                                            ))}

                                            <Button
                                                disabled={isSavingDraft}
                                                onClick={() => {
                                                    handleSaveDraft().catch(
                                                        () => undefined
                                                    );
                                                }}
                                                type="button"
                                            >
                                                {isSavingDraft
                                                    ? "Saving draft..."
                                                    : "Save Draft"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : null}

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
                                                <Input
                                                    onChange={(event) =>
                                                        setShipmentCarrier(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Carrier"
                                                    value={shipmentCarrier}
                                                />
                                                <Input
                                                    onChange={(event) =>
                                                        setShipmentTrackingNumber(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Tracking Number"
                                                    value={
                                                        shipmentTrackingNumber
                                                    }
                                                />
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
                                                        <p className="md:col-span-2">
                                                            {
                                                                orderItem
                                                                    .product
                                                                    .name
                                                            }
                                                        </p>
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
                                                                            {` (Avail ${bucket.availableQuantity})`}
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
