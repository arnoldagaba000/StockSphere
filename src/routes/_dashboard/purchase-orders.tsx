import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ArrowRight, FileText, PackageCheck, ReceiptText } from "lucide-react";
import { useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import { z } from "zod";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import {
    RouteErrorFallback,
    RoutePendingFallback,
} from "@/components/layout/route-feedback";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getDefaultPurchaseUnitPrice } from "@/features/orders/order-form-defaults";
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
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

interface PurchaseOrderFormItem {
    id: string;
    notes: string;
    productId: string;
    quantity: string;
    taxRate: string;
    unitPrice: string;
}

const createLineItem = (
    products: Awaited<ReturnType<typeof getProducts>>["products"],
    productId: string
): PurchaseOrderFormItem => ({
    id: crypto.randomUUID(),
    notes: "",
    productId,
    quantity: "",
    taxRate: "0",
    unitPrice: getDefaultPurchaseUnitPrice(products, productId),
});

type TransitionAction =
    | "approve"
    | "cancel"
    | "markOrdered"
    | "reject"
    | "submit";

type PurchaseOrderDetail = Awaited<ReturnType<typeof getPurchaseOrderDetail>>;

interface PurchaseOrdersPageState {
    cancelReason: string;
    expectedDate: string;
    filterSearch: string;
    filterStatus:
        | "all"
        | "APPROVED"
        | "DRAFT"
        | "SUBMITTED"
        | "REJECTED"
        | "CANCELLED"
        | "ORDERED"
        | "RECEIVED"
        | "PARTIALLY_RECEIVED";
    filterSupplierId: string;
    isLoadingDetail: boolean;
    isSaving: boolean;
    isTransitioningId: string | null;
    items: PurchaseOrderFormItem[];
    notes: string;
    selectedOrderDetail: PurchaseOrderDetail | null;
    selectedOrderId: string | null;
    shippingCost: string;
    supplierId: string;
    taxAmount: string;
}

const purchaseOrdersPageReducer = (
    state: PurchaseOrdersPageState,
    patch: Partial<PurchaseOrdersPageState>
): PurchaseOrdersPageState => ({
    ...state,
    ...patch,
});

const purchaseOrdersSearchSchema = z.object({
    search: z.string().optional().catch(""),
    status: z
        .enum([
            "all",
            "APPROVED",
            "CANCELLED",
            "DRAFT",
            "ORDERED",
            "PARTIALLY_RECEIVED",
            "RECEIVED",
            "REJECTED",
            "SUBMITTED",
        ])
        .optional()
        .catch("all"),
    supplierId: z.string().optional().catch(""),
});

type PurchaseOrderList = Awaited<ReturnType<typeof getPurchaseOrders>>;
type ProductList = Awaited<ReturnType<typeof getProducts>>["products"];
type SupplierList = Awaited<ReturnType<typeof getSuppliers>>;
type PurchasingReport = Awaited<ReturnType<typeof getPurchasingReport>>;

interface PurchaseOrderOverviewSectionProps {
    currencyCode: string;
    report: PurchasingReport;
}

const PurchaseOrderOverviewSection = ({
    currencyCode,
    report,
}: PurchaseOrderOverviewSectionProps) => {
    return (
        <div className="space-y-4">
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    icon={ReceiptText}
                    label="30-Day Spend"
                    value={formatCurrencyFromMinorUnits(
                        report.recentSpend,
                        currencyCode
                    )}
                />
                <MetricCard
                    icon={FileText}
                    label="30-Day Orders"
                    value={String(report.recentOrderCount)}
                />
                <MetricCard
                    icon={ArrowRight}
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
                    icon={PackageCheck}
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

            <Card className="border-border/60">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                        Top Supplier Performance (30 Days)
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto rounded-md border">
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
                                        <TableCell className="font-medium">
                                            {supplier.name}
                                        </TableCell>
                                        <TableCell>
                                            {supplier.orderCount}
                                        </TableCell>
                                        <TableCell>
                                            {supplier.receivedOrders}
                                        </TableCell>
                                        <TableCell>
                                            {supplier.openOrders}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrencyFromMinorUnits(
                                                supplier.totalSpend,
                                                currencyCode
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

interface CreatePurchaseOrderSectionProps {
    currencyCode: string;
    expectedDate: string;
    isSaving: boolean;
    items: PurchaseOrderFormItem[];
    notes: string;
    onAddLineItem: () => void;
    onCreatePurchaseOrder: () => void;
    onPatchState: (patch: Partial<PurchaseOrdersPageState>) => void;
    onRemoveLineItem: (index: number) => void;
    onUpdateItem: (
        index: number,
        patch: Partial<PurchaseOrderFormItem>
    ) => void;
    products: ProductList;
    shippingCost: string;
    subtotal: number;
    supplierId: string;
    suppliers: SupplierList;
    taxAmount: string;
    total: number;
}

const CreatePurchaseOrderSection = ({
    currencyCode,
    expectedDate,
    isSaving,
    items,
    onAddLineItem,
    onCreatePurchaseOrder,
    onPatchState,
    onRemoveLineItem,
    onUpdateItem,
    products,
    shippingCost,
    subtotal,
    supplierId,
    suppliers,
    taxAmount,
    total,
    notes,
}: CreatePurchaseOrderSectionProps) => {
    return (
        <Card className="border-border/60">
            <CardHeader className="space-y-1 pb-3">
                <CardTitle className="text-base">
                    Create Purchase Order
                </CardTitle>
                <p className="text-muted-foreground text-sm">
                    Build a draft with line-level pricing, tax, and supplier
                    context.
                </p>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-4 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label>Supplier</Label>
                        <Select
                            onValueChange={(value) =>
                                onPatchState({
                                    supplierId: value ?? "",
                                })
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
                                onPatchState({
                                    expectedDate: event.target.value,
                                })
                            }
                            type="date"
                            value={expectedDate}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="tax-amount">Tax ({currencyCode})</Label>
                        <Input
                            id="tax-amount"
                            onChange={(event) =>
                                onPatchState({
                                    taxAmount: event.target.value,
                                })
                            }
                            type="number"
                            value={taxAmount}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="shipping-cost">
                            Shipping Cost ({currencyCode})
                        </Label>
                        <Input
                            id="shipping-cost"
                            onChange={(event) =>
                                onPatchState({
                                    shippingCost: event.target.value,
                                })
                            }
                            type="number"
                            value={shippingCost}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-3">
                        <Label htmlFor="po-notes">Notes (optional)</Label>
                        <Input
                            id="po-notes"
                            onChange={(event) =>
                                onPatchState({
                                    notes: event.target.value,
                                })
                            }
                            placeholder="Delivery instructions, commercial notes..."
                            value={notes}
                        />
                    </div>
                </div>

                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">Line Items</p>
                        <p className="text-muted-foreground text-xs">
                            {items.length} line{items.length === 1 ? "" : "s"}
                        </p>
                    </div>
                    {items.map((item, index) => (
                        <div
                            className="grid gap-3 rounded-lg border bg-card/60 p-3 md:grid-cols-12"
                            key={item.id}
                        >
                            <div className="space-y-1 md:col-span-4">
                                <Label className="text-xs">Product</Label>
                                <Select
                                    onValueChange={(value) =>
                                        onUpdateItem(index, {
                                            productId: value ?? "",
                                            unitPrice:
                                                getDefaultPurchaseUnitPrice(
                                                    products,
                                                    value ?? ""
                                                ),
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
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs">Quantity</Label>
                                <Input
                                    onChange={(event) =>
                                        onUpdateItem(index, {
                                            quantity: event.target.value,
                                        })
                                    }
                                    placeholder="Quantity"
                                    type="number"
                                    value={item.quantity}
                                />
                            </div>
                            <div className="space-y-1 md:col-span-3">
                                <Label className="text-xs">
                                    Unit price ({currencyCode})
                                </Label>
                                <Input
                                    onChange={(event) =>
                                        onUpdateItem(index, {
                                            unitPrice: event.target.value,
                                        })
                                    }
                                    placeholder={`Unit price (${currencyCode})`}
                                    type="number"
                                    value={item.unitPrice}
                                />
                            </div>
                            <div className="space-y-1 md:col-span-2">
                                <Label className="text-xs">Tax %</Label>
                                <Input
                                    max={100}
                                    min={0}
                                    onChange={(event) =>
                                        onUpdateItem(index, {
                                            taxRate: event.target.value,
                                        })
                                    }
                                    placeholder="Tax %"
                                    type="number"
                                    value={item.taxRate}
                                />
                            </div>
                            <div className="md:col-span-1 md:self-end">
                                <Button
                                    className="w-full"
                                    disabled={items.length <= 1}
                                    onClick={() => onRemoveLineItem(index)}
                                    type="button"
                                    variant="outline"
                                >
                                    Remove
                                </Button>
                            </div>
                            <Input
                                className="md:col-span-12"
                                onChange={(event) =>
                                    onUpdateItem(index, {
                                        notes: event.target.value,
                                    })
                                }
                                placeholder="Line notes (optional)"
                                value={item.notes}
                            />
                        </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/20 p-3">
                    <Button
                        onClick={onAddLineItem}
                        type="button"
                        variant="outline"
                    >
                        Add Line
                    </Button>
                    <p className="text-muted-foreground text-sm">
                        Subtotal:{" "}
                        {formatCurrencyFromMinorUnits(subtotal, currencyCode)} |
                        Total:{" "}
                        {formatCurrencyFromMinorUnits(total, currencyCode)}
                    </p>
                </div>
                <p className="text-muted-foreground text-xs">
                    Unit prices auto-fill from product cost. Override if this
                    supplier gave you a different quote.
                </p>

                <div className="flex items-center justify-end">
                    <Button
                        disabled={isSaving || !supplierId}
                        onClick={onCreatePurchaseOrder}
                    >
                        {isSaving ? "Creating..." : "Create Draft"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

interface PurchaseOrderListSectionProps {
    cancelReason: string;
    currencyCode: string;
    filterSearch: string;
    filterStatus: PurchaseOrdersPageState["filterStatus"];
    filterSupplierId: string;
    isTransitioningId: string | null;
    onLoadDetail: (purchaseOrderId: string) => void;
    onPatchState: (patch: Partial<PurchaseOrdersPageState>) => void;
    onSetFilters: (
        patch: Partial<
            Pick<
                PurchaseOrdersPageState,
                "filterSearch" | "filterStatus" | "filterSupplierId"
            >
        >
    ) => void;
    onTransitionOrder: (
        purchaseOrderId: string,
        action: TransitionAction
    ) => void;
    purchaseOrders: PurchaseOrderList;
}

const PurchaseOrderListSection = ({
    cancelReason,
    currencyCode,
    filterSearch,
    filterStatus,
    filterSupplierId,
    isTransitioningId,
    onLoadDetail,
    onPatchState,
    onSetFilters,
    onTransitionOrder,
    purchaseOrders,
}: PurchaseOrderListSectionProps) => {
    const filteredOrders = purchaseOrders.filter((order) => {
        const matchesSearch =
            filterSearch.trim().length === 0 ||
            order.orderNumber
                .toLowerCase()
                .includes(filterSearch.trim().toLowerCase()) ||
            order.supplier.name
                .toLowerCase()
                .includes(filterSearch.trim().toLowerCase());
        const matchesStatus =
            filterStatus === "all" || order.status === filterStatus;
        const matchesSupplier =
            filterSupplierId.length === 0 ||
            order.supplier.id === filterSupplierId;

        return matchesSearch && matchesStatus && matchesSupplier;
    });

    const uniqueSuppliers = Array.from(
        new Map(
            purchaseOrders.map((order) => [order.supplier.id, order.supplier])
        ).values()
    );

    return (
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Purchase Order List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 rounded-lg border bg-muted/20 p-3 md:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                        <Label htmlFor="po-search">Search</Label>
                        <Input
                            id="po-search"
                            onChange={(event) =>
                                onSetFilters({
                                    filterSearch: event.target.value,
                                })
                            }
                            placeholder="Search by PO number or supplier"
                            value={filterSearch}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="po-status">Status</Label>
                        <Select
                            onValueChange={(value) =>
                                onSetFilters({
                                    filterStatus:
                                        value as PurchaseOrdersPageState["filterStatus"],
                                })
                            }
                            value={filterStatus}
                        >
                            <SelectTrigger id="po-status">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="DRAFT">Draft</SelectItem>
                                <SelectItem value="SUBMITTED">
                                    Submitted
                                </SelectItem>
                                <SelectItem value="APPROVED">
                                    Approved
                                </SelectItem>
                                <SelectItem value="ORDERED">Ordered</SelectItem>
                                <SelectItem value="PARTIALLY_RECEIVED">
                                    Partially Received
                                </SelectItem>
                                <SelectItem value="RECEIVED">
                                    Received
                                </SelectItem>
                                <SelectItem value="REJECTED">
                                    Rejected
                                </SelectItem>
                                <SelectItem value="CANCELLED">
                                    Cancelled
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="po-supplier">Supplier</Label>
                        <Select
                            onValueChange={(value) =>
                                onSetFilters({
                                    filterSupplierId:
                                        value === "all" ? "" : value,
                                })
                            }
                            value={
                                filterSupplierId.length > 0
                                    ? filterSupplierId
                                    : "all"
                            }
                        >
                            <SelectTrigger id="po-supplier">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All Suppliers
                                </SelectItem>
                                {uniqueSuppliers.map((supplier) => (
                                    <SelectItem
                                        key={supplier.id}
                                        value={supplier.id}
                                    >
                                        {supplier.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="po-cancel-reason">
                            Cancel Reason (optional)
                        </Label>
                        <Input
                            id="po-cancel-reason"
                            onChange={(event) =>
                                onPatchState({
                                    cancelReason: event.target.value,
                                })
                            }
                            placeholder="Reason included in audit trail"
                            value={cancelReason}
                        />
                    </div>
                </div>
                <div className="overflow-x-auto rounded-md border">
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
                            {filteredOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell className="font-medium">
                                        {order.orderNumber}
                                    </TableCell>
                                    <TableCell>{order.supplier.name}</TableCell>
                                    <TableCell>
                                        <Badge variant="secondary">
                                            {order.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            order.totalAmount,
                                            currencyCode
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                                onClick={() =>
                                                    onLoadDetail(order.id)
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
                                                        onTransitionOrder(
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
                                                            onTransitionOrder(
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
                                                            onTransitionOrder(
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
                                                        onTransitionOrder(
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
                                                        onTransitionOrder(
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
                </div>
            </CardContent>
        </Card>
    );
};

interface PurchaseOrderDetailSectionProps {
    isLoadingDetail: boolean;
    selectedOrderDetail: PurchaseOrderDetail | null;
}

const PurchaseOrderDetailSection = ({
    isLoadingDetail,
    selectedOrderDetail,
}: PurchaseOrderDetailSectionProps) => {
    return (
        <Card className="border-border/60">
            <CardHeader className="pb-3">
                <CardTitle className="text-base">
                    Purchase Order Detail
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {isLoadingDetail ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-40" />
                        <Skeleton className="h-4 w-64" />
                    </div>
                ) : null}
                {selectedOrderDetail || isLoadingDetail ? null : (
                    <p className="text-muted-foreground text-sm">
                        Select an order from the list to inspect item-level
                        progress and receipts.
                    </p>
                )}
                {selectedOrderDetail ? (
                    <>
                        <div className="grid gap-2 rounded-lg border bg-muted/20 p-3 md:grid-cols-3">
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

                        <div className="overflow-x-auto rounded-md border">
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
                        </div>

                        <div className="space-y-1">
                            <p className="font-medium text-sm">Receipts</p>
                            {selectedOrderDetail.receipts.length === 0 ? (
                                <p className="text-muted-foreground text-sm">
                                    No receipts posted yet.
                                </p>
                            ) : (
                                selectedOrderDetail.receipts.map((receipt) => (
                                    <p className="text-sm" key={receipt.id}>
                                        {receipt.receiptNumber} •{" "}
                                        {new Date(
                                            receipt.receivedDate
                                        ).toLocaleDateString()}{" "}
                                        • {receipt.items.length} lines
                                    </p>
                                ))
                            )}
                        </div>
                    </>
                ) : null}
            </CardContent>
        </Card>
    );
};

export const Route = createFileRoute("/_dashboard/purchase-orders")({
    component: PurchaseOrdersPage,
    errorComponent: PurchaseOrdersRouteError,
    loader: async () => {
        const [
            financialSettings,
            suppliers,
            productsResponse,
            purchaseOrders,
            report,
        ] = await Promise.all([
            getFinancialSettings(),
            getSuppliers({ data: {} }),
            getProducts({ data: { pageSize: 200 } }),
            getPurchaseOrders({ data: {} }),
            getPurchasingReport({ data: { days: 30 } }),
        ]);

        return {
            financialSettings,
            products: productsResponse.products,
            purchaseOrders,
            report,
            suppliers,
        };
    },
    pendingComponent: PurchaseOrdersRoutePending,
    validateSearch: purchaseOrdersSearchSchema,
});

function PurchaseOrdersRoutePending() {
    return (
        <RoutePendingFallback
            subtitle="Loading purchase orders, suppliers, products, and purchasing insights."
            title="Loading Purchase Orders"
        />
    );
}

function PurchaseOrdersRouteError({
    error,
    reset,
}: {
    error: unknown;
    reset: () => void;
}) {
    return (
        <RouteErrorFallback
            error={error}
            reset={reset}
            title="Purchase orders failed to load"
            to="/"
        />
    );
}

function PurchaseOrdersPage() {
    const router = useRouter();
    const navigate = Route.useNavigate();
    const searchParams = Route.useSearch();
    const { financialSettings, products, purchaseOrders, report, suppliers } =
        Route.useLoaderData();
    const { currencyCode } = financialSettings;
    const [state, patchState] = useReducer(purchaseOrdersPageReducer, {
        cancelReason: "",
        expectedDate: "",
        filterSearch: searchParams.search ?? "",
        filterStatus: searchParams.status ?? "all",
        filterSupplierId: searchParams.supplierId ?? "",
        isLoadingDetail: false,
        isSaving: false,
        isTransitioningId: null,
        items: [createLineItem(products, products[0]?.id ?? "")],
        selectedOrderDetail: null,
        selectedOrderId: null,
        shippingCost: "0",
        supplierId: suppliers[0]?.id ?? "",
        taxAmount: "0",
        notes: "",
    });
    const {
        cancelReason,
        expectedDate,
        isLoadingDetail,
        isSaving,
        isTransitioningId,
        items,
        filterSearch,
        filterStatus,
        filterSupplierId,
        selectedOrderDetail,
        selectedOrderId,
        shippingCost,
        supplierId,
        taxAmount,
        notes,
    } = state;

    const syncFiltersToSearch = (
        nextFilters: Pick<
            PurchaseOrdersPageState,
            "filterSearch" | "filterStatus" | "filterSupplierId"
        >
    ): void => {
        navigate({
            replace: true,
            search: {
                search: nextFilters.filterSearch.trim() || undefined,
                status:
                    nextFilters.filterStatus === "all"
                        ? undefined
                        : nextFilters.filterStatus,
                supplierId:
                    nextFilters.filterSupplierId.length > 0
                        ? nextFilters.filterSupplierId
                        : undefined,
            },
        }).catch(() => undefined);
    };

    const setFilters = (
        patch: Partial<
            Pick<
                PurchaseOrdersPageState,
                "filterSearch" | "filterStatus" | "filterSupplierId"
            >
        >
    ): void => {
        patchState((current) => {
            const nextFilters = {
                filterSearch: patch.filterSearch ?? current.filterSearch,
                filterStatus: patch.filterStatus ?? current.filterStatus,
                filterSupplierId:
                    patch.filterSupplierId ?? current.filterSupplierId,
            };
            syncFiltersToSearch(nextFilters);
            return {
                ...current,
                ...patch,
            };
        });
    };

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
        patchState({
            items: items.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item
            ),
        });
    };

    const addLineItem = (): void => {
        patchState({
            items: [...items, createLineItem(products, products[0]?.id ?? "")],
        });
    };

    const removeLineItem = (index: number): void => {
        patchState({
            items: items.filter((_, i) => i !== index),
        });
    };

    const refreshData = async (): Promise<void> => {
        await router.invalidate();
        if (selectedOrderId) {
            await loadPurchaseOrderDetail(selectedOrderId);
        }
    };

    const loadPurchaseOrderDetail = async (purchaseOrderId: string) => {
        try {
            patchState({
                isLoadingDetail: true,
                selectedOrderId: purchaseOrderId,
            });
            const detail = await getPurchaseOrderDetail({
                data: { purchaseOrderId },
            });
            patchState({
                isLoadingDetail: false,
                selectedOrderDetail: detail,
            });
        } catch (error) {
            patchState({ isLoadingDetail: false });
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
                notes: item.notes.trim().length > 0 ? item.notes.trim() : null,
                productId: item.productId,
                quantity: Number(item.quantity),
                taxRate: Number(item.taxRate) || 0,
                unitPrice: Number(item.unitPrice),
            }))
            .filter((item) => item.productId && item.quantity > 0);

        if (normalizedItems.length === 0) {
            toast.error("Add at least one valid line item.");
            return;
        }
        const expectedDateValue = expectedDate ? new Date(expectedDate) : null;
        const firstProductId = products[0]?.id ?? "";
        const notesValue = notes.trim().length > 0 ? notes.trim() : null;
        const shippingCostValue = Number(shippingCost) || 0;
        const taxAmountValue = Number(taxAmount) || 0;

        try {
            patchState({ isSaving: true });
            await createPurchaseOrder({
                data: {
                    expectedDate: expectedDateValue,
                    items: normalizedItems.map((item) => ({
                        notes: item.notes,
                        productId: item.productId,
                        quantity: item.quantity,
                        taxRate: item.taxRate,
                        unitPrice: item.unitPrice,
                    })),
                    notes: notesValue,
                    shippingCost: shippingCostValue,
                    supplierId,
                    taxAmount: taxAmountValue,
                },
            });
            toast.success("Purchase order created.");
            patchState({
                expectedDate: "",
                items: [createLineItem(products, firstProductId)],
                notes: "",
                shippingCost: "0",
                taxAmount: "0",
            });
            await refreshData();
            patchState({ isSaving: false });
        } catch (error) {
            patchState({ isSaving: false });
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
            patchState({ isTransitioningId: purchaseOrderId });
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
            patchState({ isTransitioningId: null });
        } catch (error) {
            patchState({ isTransitioningId: null });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update order."
            );
        }
    };

    return (
        <section className="w-full space-y-6">
            <div className="rounded-xl border bg-card p-5">
                <h1 className="font-semibold text-2xl">Purchase Orders</h1>
                <p className="mt-1 text-muted-foreground text-sm">
                    Purchase lifecycle with supplier analytics and detailed line
                    tracking.
                </p>
            </div>

            <PurchaseOrderOverviewSection
                currencyCode={currencyCode}
                report={report}
            />
            <CreatePurchaseOrderSection
                currencyCode={currencyCode}
                expectedDate={expectedDate}
                isSaving={isSaving}
                items={items}
                notes={notes}
                onAddLineItem={addLineItem}
                onCreatePurchaseOrder={() => {
                    handleCreatePurchaseOrder().catch(() => undefined);
                }}
                onPatchState={patchState}
                onRemoveLineItem={removeLineItem}
                onUpdateItem={updateItem}
                products={products}
                shippingCost={shippingCost}
                subtotal={subtotal}
                supplierId={supplierId}
                suppliers={suppliers}
                taxAmount={taxAmount}
                total={total}
            />
            <PurchaseOrderListSection
                cancelReason={cancelReason}
                currencyCode={currencyCode}
                filterSearch={filterSearch}
                filterStatus={filterStatus}
                filterSupplierId={filterSupplierId}
                isTransitioningId={isTransitioningId}
                onLoadDetail={(purchaseOrderId) => {
                    loadPurchaseOrderDetail(purchaseOrderId).catch(
                        () => undefined
                    );
                }}
                onPatchState={patchState}
                onSetFilters={setFilters}
                onTransitionOrder={(purchaseOrderId, action) => {
                    transitionOrder(purchaseOrderId, action).catch(
                        () => undefined
                    );
                }}
                purchaseOrders={purchaseOrders}
            />
            <PurchaseOrderDetailSection
                isLoadingDetail={isLoadingDetail}
                selectedOrderDetail={selectedOrderDetail}
            />
        </section>
    );
}

function MetricCard({
    icon: Icon,
    label,
    value,
}: {
    icon: typeof ReceiptText;
    label: string;
    value: string;
}) {
    return (
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/70">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="font-medium text-sm">{label}</CardTitle>
                <Icon className="size-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
                <p className="font-semibold text-xl">{value}</p>
            </CardContent>
        </Card>
    );
}
