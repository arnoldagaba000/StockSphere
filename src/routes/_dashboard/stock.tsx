import { createFileRoute } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
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
import { adjustStock } from "@/features/inventory/adjust-stock";
import { approveAdjustment } from "@/features/inventory/approve-adjustment";
import { createInitialStock } from "@/features/inventory/create-initial-stock";
import { submitCycleCount } from "@/features/inventory/cycle-count";
import { getBatchTraceability } from "@/features/inventory/get-batch-traceability";
import { getExpiryAlerts as getExpiryAlertsReport } from "@/features/inventory/get-expiry-alerts";
import {
    getInventoryKpis,
    getInventoryValuationReport,
} from "@/features/inventory/get-inventory-reports";
import { getMovementHistory } from "@/features/inventory/get-movement-history";
import { getPutawaySuggestions } from "@/features/inventory/get-putaway-suggestions";
import { getSerialHistory } from "@/features/inventory/get-serial-history";
import { getStock } from "@/features/inventory/get-stock";
import { getWarehouses } from "@/features/inventory/get-warehouses";
import { updateStockExpiryStatus } from "@/features/inventory/manage-expiry";
import { moveToQuarantine } from "@/features/inventory/quarantine-stock";
import { receiveGoods } from "@/features/inventory/receive-goods";
import { rejectAdjustment } from "@/features/inventory/reject-adjustment";
import {
    releaseReservedStock,
    reserveStock,
} from "@/features/inventory/reserve-stock";
import { transferStock } from "@/features/inventory/transfer-stock";
import { getProducts } from "@/features/products/get-products";

const TRAILING_ZEROES_REGEX = /\.?0+$/;
const formatQuantity = (value: number): string =>
    Number.isInteger(value)
        ? String(value)
        : value.toFixed(3).replace(TRAILING_ZEROES_REGEX, "");

type StockData = Awaited<ReturnType<typeof getStock>>;
type ValuationData = Awaited<ReturnType<typeof getInventoryValuationReport>>;
type MovementHistoryData = Awaited<ReturnType<typeof getMovementHistory>>;
type BatchTraceabilityData = Awaited<ReturnType<typeof getBatchTraceability>>;
type SerialHistoryData = Awaited<ReturnType<typeof getSerialHistory>>;
type ExpiryAlertsData = Awaited<ReturnType<typeof getExpiryAlertsReport>>;
type StockItem = StockData["stockItems"][number];
type Product = Awaited<ReturnType<typeof getProducts>>["products"][number];
type Warehouse = Awaited<ReturnType<typeof getWarehouses>>[number];
type MovementHistoryItem = MovementHistoryData["movements"][number];

const MOVEMENT_TYPE_OPTIONS = [
    "PURCHASE_RECEIPT",
    "SALES_SHIPMENT",
    "TRANSFER",
    "ADJUSTMENT",
    "RETURN",
    "ASSEMBLY",
    "DISASSEMBLY",
] as const;

interface StockPageState {
    adjustmentApprovalNotes: string;
    adjustmentId: string;
    adjustmentRejectionReason: string;
    adjustQuantity: string;
    cycleQuantity: string;
    entryProductId: string;
    entryQuantity: string;
    entryUnitCost: string;
    entryWarehouseId: string;
    expiryAlerts: ExpiryAlertsData;
    movementHistory: MovementHistoryData | null;
    movementPage: string;
    movementProductId: string;
    movementType: string;
    movementWarehouseId: string;
    releaseQuantity: string;
    reserveQuantity: string;
    selectedStockItemId: string;
    stockData: StockData;
    traceabilityData: BatchTraceabilityData | null;
    quarantineReason: string;
    serialHistoryData: SerialHistoryData | null;
    trackingBatch: string;
    trackingSerial: string;
    transferQuantity: string;
    transferWarehouseId: string;
    valuation: ValuationData;
}

type StockPageAction =
    | Partial<StockPageState>
    | ((state: StockPageState) => Partial<StockPageState>);

const stockPageReducer = (
    state: StockPageState,
    action: StockPageAction
): StockPageState => {
    const patch = typeof action === "function" ? action(state) : action;
    return { ...state, ...patch };
};

export const Route = createFileRoute("/_dashboard/stock")({
    component: StockPage,
    loader: async () => {
        const [warehouses, productsResult, initialStock, kpis, valuation] =
            await Promise.all([
                getWarehouses({ data: {} }),
                getProducts({ data: { pageSize: 200 } }),
                getStock({ data: { pageSize: 150 } }),
                getInventoryKpis({ data: { withinDays: 30 } }),
                getInventoryValuationReport({ data: {} }),
            ]);

        return {
            initialStock,
            initialValuation: valuation,
            kpis,
            products: productsResult.products,
            warehouses,
        };
    },
});

interface StockEntryCardProps {
    entryProductId: string;
    entryQuantity: string;
    entryUnitCost: string;
    entryWarehouseId: string;
    products: Product[];
    runAction: (
        work: () => Promise<unknown>,
        successMessage: string
    ) => Promise<void>;
    setState: (action: StockPageAction) => void;
    warehouses: Warehouse[];
}

const StockEntryCard = ({
    entryProductId,
    entryQuantity,
    entryUnitCost,
    entryWarehouseId,
    products,
    runAction,
    setState,
    warehouses,
}: StockEntryCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Initial Stock + Receiving</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
                <FieldSelect
                    label="Warehouse"
                    onValueChange={(value) =>
                        setState({ entryWarehouseId: value })
                    }
                    options={warehouses.map((warehouse) => ({
                        label: `${warehouse.code} - ${warehouse.name}`,
                        value: warehouse.id,
                    }))}
                    value={entryWarehouseId}
                />
                <FieldSelect
                    label="Product"
                    onValueChange={(value) =>
                        setState({ entryProductId: value })
                    }
                    options={products.map((product) => ({
                        label: `${product.sku} - ${product.name}`,
                        value: product.id,
                    }))}
                    value={entryProductId}
                />
                <FieldInput
                    label="Quantity"
                    onChange={(value) => setState({ entryQuantity: value })}
                    type="number"
                    value={entryQuantity}
                />
                <FieldInput
                    label="Unit Cost (UGX)"
                    onChange={(value) => setState({ entryUnitCost: value })}
                    type="number"
                    value={entryUnitCost}
                />
                <div className="flex flex-wrap gap-2 md:col-span-2">
                    <Button
                        disabled={
                            !(
                                entryProductId &&
                                entryWarehouseId &&
                                entryQuantity
                            )
                        }
                        onClick={() =>
                            runAction(
                                () =>
                                    createInitialStock({
                                        data: {
                                            batchNumber: null,
                                            expiryDate: null,
                                            locationId: null,
                                            notes: null,
                                            productId: entryProductId,
                                            quantity: Number(entryQuantity),
                                            serialNumber: null,
                                            unitCost: entryUnitCost
                                                ? Number(entryUnitCost)
                                                : null,
                                            warehouseId: entryWarehouseId,
                                        },
                                    }),
                                "Initial stock created."
                            )
                        }
                    >
                        Create Initial Stock
                    </Button>
                    <Button
                        disabled={
                            !(
                                entryProductId &&
                                entryWarehouseId &&
                                entryQuantity
                            )
                        }
                        onClick={() =>
                            runAction(
                                () =>
                                    receiveGoods({
                                        data: {
                                            items: [
                                                {
                                                    productId: entryProductId,
                                                    quantity:
                                                        Number(entryQuantity),
                                                    unitCost: entryUnitCost
                                                        ? Number(entryUnitCost)
                                                        : null,
                                                },
                                            ],
                                            warehouseId: entryWarehouseId,
                                        },
                                    }),
                                "Goods received."
                            )
                        }
                        variant="outline"
                    >
                        Receive Goods
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

interface StockOperationsCardProps {
    adjustQuantity: string;
    cycleQuantity: string;
    releaseQuantity: string;
    reserveQuantity: string;
    runAction: (
        work: () => Promise<unknown>,
        successMessage: string
    ) => Promise<void>;
    selectedItem: StockItem | undefined;
    selectedStockItemId: string;
    setState: (action: StockPageAction) => void;
    stockItems: StockItem[];
    transferQuantity: string;
    transferWarehouseId: string;
    warehouses: Warehouse[];
}

const StockOperationsCard = ({
    adjustQuantity,
    cycleQuantity,
    releaseQuantity,
    reserveQuantity,
    runAction,
    selectedItem,
    selectedStockItemId,
    setState,
    stockItems,
    transferQuantity,
    transferWarehouseId,
    warehouses,
}: StockOperationsCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Stock Operations</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-4">
                <FieldSelect
                    label="Stock Item"
                    onValueChange={(value) =>
                        setState({ selectedStockItemId: value })
                    }
                    options={stockItems.map((item) => ({
                        label: `${item.product.sku} - ${item.warehouse.code} - ${item.location?.code ?? "NO-LOC"}`,
                        value: item.id,
                    }))}
                    value={selectedStockItemId}
                />
                <FieldInput
                    label="Transfer Qty"
                    onChange={(value) => setState({ transferQuantity: value })}
                    type="number"
                    value={transferQuantity}
                />
                <FieldSelect
                    label="To Warehouse"
                    onValueChange={(value) =>
                        setState({ transferWarehouseId: value })
                    }
                    options={warehouses.map((warehouse) => ({
                        label: `${warehouse.code} - ${warehouse.name}`,
                        value: warehouse.id,
                    }))}
                    value={transferWarehouseId}
                />
                <div className="flex items-end">
                    <Button
                        disabled={
                            !(
                                selectedItem &&
                                transferQuantity &&
                                transferWarehouseId
                            )
                        }
                        onClick={() =>
                            runAction(
                                () =>
                                    transferStock({
                                        data: {
                                            quantity: Number(transferQuantity),
                                            stockItemId: selectedStockItemId,
                                            toWarehouseId: transferWarehouseId,
                                        },
                                    }),
                                "Stock transferred."
                            )
                        }
                        variant="outline"
                    >
                        Transfer
                    </Button>
                </div>

                <FieldInput
                    label="Adjust To Qty"
                    onChange={(value) => setState({ adjustQuantity: value })}
                    type="number"
                    value={adjustQuantity}
                />
                <FieldInput
                    label="Reserve Qty"
                    onChange={(value) => setState({ reserveQuantity: value })}
                    type="number"
                    value={reserveQuantity}
                />
                <FieldInput
                    label="Release Qty"
                    onChange={(value) => setState({ releaseQuantity: value })}
                    type="number"
                    value={releaseQuantity}
                />
                <FieldInput
                    label="Cycle Count Qty"
                    onChange={(value) => setState({ cycleQuantity: value })}
                    type="number"
                    value={cycleQuantity}
                />
                <div className="flex flex-wrap gap-2 md:col-span-4">
                    <Button
                        disabled={!(selectedItem && adjustQuantity)}
                        onClick={() =>
                            runAction(
                                () =>
                                    adjustStock({
                                        data: {
                                            countedQuantity:
                                                Number(adjustQuantity),
                                            reason: "PHYSICAL_COUNT",
                                            stockItemId: selectedStockItemId,
                                        },
                                    }),
                                "Stock adjusted."
                            )
                        }
                        variant="outline"
                    >
                        Adjust
                    </Button>
                    <Button
                        disabled={!(selectedItem && reserveQuantity)}
                        onClick={() =>
                            runAction(
                                () =>
                                    reserveStock({
                                        data: {
                                            quantity: Number(reserveQuantity),
                                            stockItemId: selectedStockItemId,
                                        },
                                    }),
                                "Stock reserved."
                            )
                        }
                        variant="outline"
                    >
                        Reserve
                    </Button>
                    <Button
                        disabled={!(selectedItem && releaseQuantity)}
                        onClick={() =>
                            runAction(
                                () =>
                                    releaseReservedStock({
                                        data: {
                                            quantity: Number(releaseQuantity),
                                            stockItemId: selectedStockItemId,
                                        },
                                    }),
                                "Stock released."
                            )
                        }
                        variant="outline"
                    >
                        Release
                    </Button>
                    <Button
                        disabled={!(selectedItem && cycleQuantity)}
                        onClick={() =>
                            runAction(
                                () =>
                                    submitCycleCount({
                                        data: {
                                            countedQuantity:
                                                Number(cycleQuantity),
                                            stockItemId: selectedStockItemId,
                                        },
                                    }),
                                "Cycle count submitted."
                            )
                        }
                    >
                        Cycle Count
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

interface StockTrackingCardProps {
    entryProductId: string;
    entryQuantity: string;
    entryWarehouseId: string;
    expiryAlerts: ExpiryAlertsData;
    onLoadBatchTraceability: () => Promise<void>;
    onLoadExpiryAlerts: () => Promise<void>;
    onLoadSerialHistory: () => Promise<void>;
    runAction: (
        work: () => Promise<unknown>,
        successMessage: string
    ) => Promise<void>;
    quarantineReason: string;
    selectedItem: StockItem | undefined;
    selectedStockItemId: string;
    serialHistoryData: SerialHistoryData | null;
    setState: (action: StockPageAction) => void;
    traceabilityData: BatchTraceabilityData | null;
    trackingBatch: string;
    trackingSerial: string;
}

const StockTrackingCard = ({
    entryProductId,
    entryQuantity,
    entryWarehouseId,
    expiryAlerts,
    onLoadBatchTraceability,
    onLoadExpiryAlerts,
    onLoadSerialHistory,
    runAction,
    quarantineReason,
    selectedItem,
    selectedStockItemId,
    serialHistoryData,
    setState,
    traceabilityData,
    trackingBatch,
    trackingSerial,
}: StockTrackingCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Tracking, Expiry, Putaway</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
                <FieldInput
                    label="Serial"
                    onChange={(value) => setState({ trackingSerial: value })}
                    value={trackingSerial}
                />
                <FieldInput
                    label="Batch"
                    onChange={(value) => setState({ trackingBatch: value })}
                    value={trackingBatch}
                />
                <div className="flex items-end">
                    <Button
                        onClick={() => {
                            onLoadSerialHistory().catch(() => undefined);
                        }}
                        variant="outline"
                    >
                        Search Serial
                    </Button>
                </div>
                <div className="flex items-end">
                    <Button
                        onClick={() => {
                            onLoadBatchTraceability().catch(() => undefined);
                        }}
                        variant="outline"
                    >
                        Trace Batch
                    </Button>
                </div>
                <FieldInput
                    label="Quarantine Reason"
                    onChange={(value) => setState({ quarantineReason: value })}
                    value={quarantineReason}
                />
                <div className="flex flex-wrap gap-2 md:col-span-3">
                    <Button
                        onClick={() => {
                            onLoadExpiryAlerts().catch(() => undefined);
                        }}
                        variant="outline"
                    >
                        Refresh Expiry Alerts
                    </Button>
                    <Button
                        disabled={!(selectedItem && quarantineReason.trim())}
                        onClick={() =>
                            runAction(
                                () =>
                                    moveToQuarantine({
                                        data: {
                                            quarantineLocationId: null,
                                            reason: quarantineReason.trim(),
                                            stockItemId: selectedStockItemId,
                                        },
                                    }),
                                "Moved to quarantine."
                            )
                        }
                        variant="outline"
                    >
                        Quarantine Selected
                    </Button>
                    <Button
                        disabled={!selectedItem}
                        onClick={() =>
                            runAction(
                                () =>
                                    updateStockExpiryStatus({
                                        data: {
                                            operation: "DISPOSE",
                                            stockItemId: selectedStockItemId,
                                        },
                                    }),
                                "Disposed selected stock."
                            )
                        }
                        variant="destructive"
                    >
                        Dispose Selected
                    </Button>
                    <Button
                        disabled={
                            !(
                                entryProductId &&
                                entryWarehouseId &&
                                entryQuantity
                            )
                        }
                        onClick={() =>
                            runAction(
                                () =>
                                    getPutawaySuggestions({
                                        data: {
                                            productId: entryProductId,
                                            quantity: Number(entryQuantity),
                                            warehouseId: entryWarehouseId,
                                        },
                                    }),
                                "Putaway suggestions generated."
                            )
                        }
                        variant="outline"
                    >
                        Generate Putaway Suggestions
                    </Button>
                </div>
                {expiryAlerts.length > 0 ? (
                    <div className="md:col-span-3">
                        <p className="font-medium text-sm">
                            Expiry Alerts ({expiryAlerts.length})
                        </p>
                        <p className="text-muted-foreground text-xs">
                            Top alert: {expiryAlerts[0]?.product.sku} -{" "}
                            {expiryAlerts[0]?.daysUntilExpiry} days
                        </p>
                        <div className="mt-2 space-y-1 text-xs">
                            {expiryAlerts.slice(0, 5).map((alert) => (
                                <p key={alert.id}>
                                    {alert.product.sku} |{" "}
                                    {alert.location?.code ?? "NO-LOC"} |{" "}
                                    {alert.daysUntilExpiry} days |{" "}
                                    {formatQuantity(alert.availableQuantity)}{" "}
                                    available
                                </p>
                            ))}
                        </div>
                    </div>
                ) : null}
                {serialHistoryData ? (
                    <div className="md:col-span-3">
                        <p className="font-medium text-sm">
                            Serial History ({serialHistoryData.serialNumber})
                        </p>
                        <p className="text-muted-foreground text-xs">
                            Movements:{" "}
                            {serialHistoryData.movementHistory.length}
                        </p>
                        <div className="mt-2 space-y-1 text-xs">
                            {serialHistoryData.movementHistory
                                .slice(0, 5)
                                .map((movement) => (
                                    <p key={movement.id}>
                                        {new Date(
                                            movement.createdAt
                                        ).toLocaleDateString()}{" "}
                                        | {movement.type} |{" "}
                                        {formatQuantity(movement.quantity)}
                                    </p>
                                ))}
                        </div>
                    </div>
                ) : null}
                {traceabilityData ? (
                    <div className="md:col-span-3">
                        <p className="font-medium text-sm">
                            Batch Traceability ({traceabilityData.batchNumber})
                        </p>
                        <p className="text-muted-foreground text-xs">
                            Received:{" "}
                            {formatQuantity(
                                traceabilityData.summary.totalReceived
                            )}{" "}
                            | Shipped:{" "}
                            {formatQuantity(
                                traceabilityData.summary.totalShipped
                            )}{" "}
                            | On Hand:{" "}
                            {formatQuantity(
                                traceabilityData.summary.totalOnHand
                            )}
                        </p>
                    </div>
                ) : null}
            </CardContent>
        </Card>
    );
};

interface AdjustmentReviewCardProps {
    adjustmentApprovalNotes: string;
    adjustmentId: string;
    adjustmentRejectionReason: string;
    runAction: (
        work: () => Promise<unknown>,
        successMessage: string
    ) => Promise<void>;
    setState: (action: StockPageAction) => void;
}

const AdjustmentReviewCard = ({
    adjustmentApprovalNotes,
    adjustmentId,
    adjustmentRejectionReason,
    runAction,
    setState,
}: AdjustmentReviewCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Adjustment Review</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
                <FieldInput
                    label="Adjustment ID"
                    onChange={(value) => setState({ adjustmentId: value })}
                    value={adjustmentId}
                />
                <FieldInput
                    label="Approval Notes"
                    onChange={(value) =>
                        setState({ adjustmentApprovalNotes: value })
                    }
                    value={adjustmentApprovalNotes}
                />
                <FieldInput
                    label="Rejection Reason"
                    onChange={(value) =>
                        setState({ adjustmentRejectionReason: value })
                    }
                    value={adjustmentRejectionReason}
                />
                <div className="flex flex-wrap gap-2 md:col-span-3">
                    <Button
                        disabled={!adjustmentId}
                        onClick={() =>
                            runAction(
                                () =>
                                    approveAdjustment({
                                        data: {
                                            adjustmentId,
                                            approvalNotes:
                                                adjustmentApprovalNotes || null,
                                        },
                                    }),
                                "Adjustment approval logged."
                            )
                        }
                        variant="outline"
                    >
                        Approve Adjustment
                    </Button>
                    <Button
                        disabled={
                            !(
                                adjustmentId &&
                                adjustmentRejectionReason.trim().length > 0
                            )
                        }
                        onClick={() =>
                            runAction(
                                () =>
                                    rejectAdjustment({
                                        data: {
                                            adjustmentId,
                                            rejectionReason:
                                                adjustmentRejectionReason.trim(),
                                        },
                                    }),
                                "Adjustment rejection logged."
                            )
                        }
                        variant="destructive"
                    >
                        Reject Adjustment
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

interface MovementHistoryCardProps {
    movementHistory: MovementHistoryData | null;
    movementPage: string;
    movementProductId: string;
    movementType: string;
    movementWarehouseId: string;
    onLoadHistory: () => Promise<void>;
    products: Product[];
    setState: (action: StockPageAction) => void;
    warehouses: Warehouse[];
}

const MovementHistoryCard = ({
    movementHistory,
    movementPage,
    movementProductId,
    movementType,
    movementWarehouseId,
    onLoadHistory,
    products,
    setState,
    warehouses,
}: MovementHistoryCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Movement History</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                    <FieldSelect
                        label="Warehouse"
                        onValueChange={(value) =>
                            setState({
                                movementWarehouseId:
                                    value === "all" ? "" : value,
                            })
                        }
                        options={[
                            { label: "All Warehouses", value: "all" },
                            ...warehouses.map((warehouse) => ({
                                label: `${warehouse.code} - ${warehouse.name}`,
                                value: warehouse.id,
                            })),
                        ]}
                        value={movementWarehouseId || "all"}
                    />
                    <FieldSelect
                        label="Product"
                        onValueChange={(value) =>
                            setState({
                                movementProductId: value === "all" ? "" : value,
                            })
                        }
                        options={[
                            { label: "All Products", value: "all" },
                            ...products.map((product) => ({
                                label: `${product.sku} - ${product.name}`,
                                value: product.id,
                            })),
                        ]}
                        value={movementProductId || "all"}
                    />
                    <FieldSelect
                        label="Movement Type"
                        onValueChange={(value) =>
                            setState({
                                movementType: value === "all" ? "" : value,
                            })
                        }
                        options={[
                            { label: "All Types", value: "all" },
                            ...MOVEMENT_TYPE_OPTIONS.map((type) => ({
                                label: type,
                                value: type,
                            })),
                        ]}
                        value={movementType || "all"}
                    />
                    <FieldInput
                        label="Page"
                        onChange={(value) => setState({ movementPage: value })}
                        type="number"
                        value={movementPage}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={() => {
                            onLoadHistory().catch(() => undefined);
                        }}
                        type="button"
                        variant="outline"
                    >
                        Load Movement History
                    </Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>When</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Product</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>From</TableHead>
                            <TableHead>To</TableHead>
                            <TableHead>Reference</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {(movementHistory?.movements ?? []).length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    No movements loaded.
                                </TableCell>
                            </TableRow>
                        ) : (
                            movementHistory?.movements.map(
                                (movement: MovementHistoryItem) => (
                                    <TableRow key={movement.id}>
                                        <TableCell>
                                            {new Date(
                                                movement.createdAt
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell>{movement.type}</TableCell>
                                        <TableCell>
                                            {movement.product
                                                ? `${movement.product.sku} - ${movement.product.name}`
                                                : movement.productId}
                                        </TableCell>
                                        <TableCell>
                                            {formatQuantity(movement.quantity)}
                                        </TableCell>
                                        <TableCell>
                                            {movement.fromWarehouse?.code ??
                                                "\u2014"}
                                        </TableCell>
                                        <TableCell>
                                            {movement.toWarehouse?.code ??
                                                "\u2014"}
                                        </TableCell>
                                        <TableCell>
                                            {movement.inventoryTransaction
                                                ?.transactionNumber ??
                                                movement.referenceNumber ??
                                                "\u2014"}
                                        </TableCell>
                                    </TableRow>
                                )
                            )
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

function StockPage() {
    const { initialStock, initialValuation, kpis, products, warehouses } =
        Route.useLoaderData();

    const [state, setState] = useReducer(stockPageReducer, {
        adjustmentApprovalNotes: "",
        adjustmentId: "",
        adjustmentRejectionReason: "",
        adjustQuantity: "",
        cycleQuantity: "",
        entryProductId: products[0]?.id ?? "",
        entryQuantity: "",
        entryUnitCost: "",
        entryWarehouseId: warehouses[0]?.id ?? "",
        expiryAlerts: [],
        movementHistory: null,
        movementPage: "1",
        movementProductId: "",
        movementType: "",
        movementWarehouseId: "",
        releaseQuantity: "",
        reserveQuantity: "",
        quarantineReason: "",
        selectedStockItemId: "",
        serialHistoryData: null,
        stockData: initialStock,
        traceabilityData: null,
        trackingBatch: "",
        trackingSerial: "",
        transferQuantity: "",
        transferWarehouseId: warehouses[0]?.id ?? "",
        valuation: initialValuation,
    });

    const loadExpiryAlerts = async () => {
        try {
            const expiryAlerts = await getExpiryAlertsReport({
                data: {
                    daysAhead: 30,
                    warehouseId:
                        state.entryWarehouseId.length > 0
                            ? state.entryWarehouseId
                            : undefined,
                },
            });
            setState({ expiryAlerts });
            toast.success("Expiry alerts loaded.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load expiry alerts."
            );
        }
    };

    const loadSerialHistory = async () => {
        if (state.trackingSerial.trim().length === 0) {
            toast.error("Enter a serial number.");
            return;
        }
        try {
            const serialHistoryData = await getSerialHistory({
                data: {
                    serialNumber: state.trackingSerial.trim(),
                },
            });
            setState({ serialHistoryData });
            toast.success("Serial history loaded.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load serial history."
            );
        }
    };

    const loadBatchTraceability = async () => {
        if (state.trackingBatch.trim().length === 0 || !state.entryProductId) {
            toast.error("Select product and enter a batch number.");
            return;
        }
        try {
            const traceabilityData = await getBatchTraceability({
                data: {
                    batchNumber: state.trackingBatch.trim(),
                    productId: state.entryProductId,
                },
            });
            setState({ traceabilityData });
            toast.success("Batch traceability loaded.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load batch traceability."
            );
        }
    };

    const loadMovementHistory = async () => {
        const movementType =
            state.movementType.length > 0
                ? (state.movementType as
                      | "ADJUSTMENT"
                      | "ASSEMBLY"
                      | "DISASSEMBLY"
                      | "PURCHASE_RECEIPT"
                      | "RETURN"
                      | "SALES_SHIPMENT"
                      | "TRANSFER")
                : undefined;
        const page = Number(state.movementPage) || 1;
        const productId =
            state.movementProductId.length > 0
                ? state.movementProductId
                : undefined;
        const warehouseId =
            state.movementWarehouseId.length > 0
                ? state.movementWarehouseId
                : undefined;

        try {
            const movementHistory = await getMovementHistory({
                data: {
                    movementType,
                    page,
                    pageSize: 25,
                    productId,
                    warehouseId,
                },
            });
            setState({ movementHistory });
            toast.success("Movement history loaded.");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load movement history."
            );
        }
    };

    const refreshAll = async () => {
        const [nextStock, nextValuation] = await Promise.all([
            getStock({ data: { pageSize: 150 } }),
            getInventoryValuationReport({ data: {} }),
        ]);
        setState({ stockData: nextStock, valuation: nextValuation });
    };

    const runAction = async (
        work: () => Promise<unknown>,
        successMessage: string
    ) => {
        try {
            await work();
            toast.success(successMessage);
            await refreshAll();
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Action failed."
            );
        }
    };

    const selectedItem = state.stockData.stockItems.find(
        (item) => item.id === state.selectedStockItemId
    );

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Stock Management</h1>
                <p className="text-muted-foreground text-sm">
                    End-to-end inventory controls: transfer, adjust, reserve,
                    tracking, expiry, cycle count, receiving, putaway, and
                    valuation.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <MetricCard
                    label="On Hand"
                    value={formatQuantity(kpis.totalOnHand)}
                />
                <MetricCard
                    label="Reserved"
                    value={formatQuantity(kpis.totalReserved)}
                />
                <MetricCard
                    label="Available"
                    value={formatQuantity(kpis.totalAvailable)}
                />
                <MetricCard
                    label="Low Stock"
                    value={String(kpis.lowStockBuckets)}
                />
                <MetricCard
                    label="Expiring Soon"
                    value={String(kpis.expiringSoonBuckets)}
                />
                <MetricCard
                    label="Stock Value"
                    value={formatCurrencyFromMinorUnits(kpis.totalValue)}
                />
            </div>

            <StockEntryCard
                entryProductId={state.entryProductId}
                entryQuantity={state.entryQuantity}
                entryUnitCost={state.entryUnitCost}
                entryWarehouseId={state.entryWarehouseId}
                products={products}
                runAction={runAction}
                setState={setState}
                warehouses={warehouses}
            />

            <StockOperationsCard
                adjustQuantity={state.adjustQuantity}
                cycleQuantity={state.cycleQuantity}
                releaseQuantity={state.releaseQuantity}
                reserveQuantity={state.reserveQuantity}
                runAction={runAction}
                selectedItem={selectedItem}
                selectedStockItemId={state.selectedStockItemId}
                setState={setState}
                stockItems={state.stockData.stockItems}
                transferQuantity={state.transferQuantity}
                transferWarehouseId={state.transferWarehouseId}
                warehouses={warehouses}
            />

            <StockTrackingCard
                entryProductId={state.entryProductId}
                entryQuantity={state.entryQuantity}
                entryWarehouseId={state.entryWarehouseId}
                expiryAlerts={state.expiryAlerts}
                onLoadBatchTraceability={loadBatchTraceability}
                onLoadExpiryAlerts={loadExpiryAlerts}
                onLoadSerialHistory={loadSerialHistory}
                quarantineReason={state.quarantineReason}
                runAction={runAction}
                selectedItem={selectedItem}
                selectedStockItemId={state.selectedStockItemId}
                serialHistoryData={state.serialHistoryData}
                setState={setState}
                traceabilityData={state.traceabilityData}
                trackingBatch={state.trackingBatch}
                trackingSerial={state.trackingSerial}
            />

            <AdjustmentReviewCard
                adjustmentApprovalNotes={state.adjustmentApprovalNotes}
                adjustmentId={state.adjustmentId}
                adjustmentRejectionReason={state.adjustmentRejectionReason}
                runAction={runAction}
                setState={setState}
            />

            <MovementHistoryCard
                movementHistory={state.movementHistory}
                movementPage={state.movementPage}
                movementProductId={state.movementProductId}
                movementType={state.movementType}
                movementWarehouseId={state.movementWarehouseId}
                onLoadHistory={loadMovementHistory}
                products={products}
                setState={setState}
                warehouses={warehouses}
            />

            <Card>
                <CardHeader>
                    <CardTitle>Stock Buckets</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Warehouse</TableHead>
                                <TableHead>Location</TableHead>
                                <TableHead>Quantity</TableHead>
                                <TableHead>Reserved</TableHead>
                                <TableHead>Available</TableHead>
                                <TableHead>Unit Cost</TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {state.stockData.stockItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {item.product.sku} - {item.product.name}
                                    </TableCell>
                                    <TableCell>{item.warehouse.name}</TableCell>
                                    <TableCell>
                                        {item.location
                                            ? `${item.location.code} - ${item.location.name}`
                                            : "\u2014"}
                                    </TableCell>
                                    <TableCell>
                                        {formatQuantity(item.quantity)}
                                    </TableCell>
                                    <TableCell>
                                        {formatQuantity(item.reservedQuantity)}
                                    </TableCell>
                                    <TableCell>
                                        {formatQuantity(item.availableQuantity)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            item.unitCostDisplay
                                        )}
                                    </TableCell>
                                    <TableCell>{item.status}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Valuation Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                    <p>
                        Total stock value:{" "}
                        {formatCurrencyFromMinorUnits(
                            state.valuation.totalValue
                        )}
                    </p>
                    <p>
                        Warehouse groups: {state.valuation.byWarehouse.length}
                    </p>
                    <p>Location groups: {state.valuation.byLocation.length}</p>
                    <p>Category groups: {state.valuation.byCategory.length}</p>
                </CardContent>
            </Card>
        </section>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardContent className="p-4">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="font-semibold text-xl">{value}</p>
            </CardContent>
        </Card>
    );
}

interface FieldInputProps {
    label: string;
    onChange: (value: string) => void;
    type?: string;
    value: string;
}

function FieldInput({
    label,
    onChange,
    type = "text",
    value,
}: FieldInputProps) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Input
                onChange={(event) => onChange(event.target.value)}
                type={type}
                value={value}
            />
        </div>
    );
}

interface FieldSelectProps {
    label: string;
    onValueChange: (value: string) => void;
    options: { label: string; value: string }[];
    value: string;
}

function FieldSelect({
    label,
    onValueChange,
    options,
    value,
}: FieldSelectProps) {
    return (
        <div className="space-y-2">
            <Label>{label}</Label>
            <Select
                onValueChange={(nextValue) => onValueChange(nextValue ?? "")}
                value={value}
            >
                <SelectTrigger>
                    <SelectValue />
                </SelectTrigger>
                <SelectContent>
                    {options.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                            {option.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
}
