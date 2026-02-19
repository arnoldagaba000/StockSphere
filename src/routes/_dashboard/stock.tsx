import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
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
import { createInitialStock } from "@/features/inventory/create-initial-stock";
import { getStock } from "@/features/inventory/get-stock";
import { getWarehouses } from "@/features/inventory/get-warehouses";
import { getLocations } from "@/features/location/get-locations";
import { getProducts } from "@/features/products/get-products";

export const Route = createFileRoute("/_dashboard/stock")({
    component: StockPage,
    loader: async () => {
        const [warehouses, productsResult, initialStock] = await Promise.all([
            getWarehouses({ data: {} }),
            getProducts({ data: { pageSize: 100 } }),
            getStock({ data: { pageSize: 100 } }),
        ]);

        return {
            initialStock,
            products: productsResult.products,
            warehouses,
        };
    },
});

const formatQuantity = (value: number): string =>
    Number.isInteger(value)
        ? String(value)
        : value.toFixed(3).replace(TRAILING_ZEROES_REGEX, "");

const TRAILING_ZEROES_REGEX = /\.?0+$/;

function StockPage() {
    const { initialStock, products, warehouses } = Route.useLoaderData();
    const [stockData, setStockData] = useState(initialStock);
    const [isLoadingStock, setIsLoadingStock] = useState(false);
    const [warehouseFilter, setWarehouseFilter] = useState("all");
    const [productFilter, setProductFilter] = useState("all");
    const [belowReorder, setBelowReorder] = useState(false);

    const defaultWarehouseId = warehouses[0]?.id ?? "";
    const defaultProductId = products[0]?.id ?? "";
    const [entryWarehouseId, setEntryWarehouseId] =
        useState(defaultWarehouseId);
    const [entryProductId, setEntryProductId] = useState(defaultProductId);
    const [entryLocationId, setEntryLocationId] = useState("none");
    const [entryLocations, setEntryLocations] = useState<
        Awaited<ReturnType<typeof getLocations>>
    >([]);
    const [entryQuantity, setEntryQuantity] = useState("");
    const [entryUnitCost, setEntryUnitCost] = useState("");
    const [entryBatchNumber, setEntryBatchNumber] = useState("");
    const [entrySerialNumber, setEntrySerialNumber] = useState("");
    const [entryExpiryDate, setEntryExpiryDate] = useState("");
    const [entryNotes, setEntryNotes] = useState("");
    const [isSubmittingEntry, setIsSubmittingEntry] = useState(false);

    const productById = useMemo(
        () => new Map(products.map((product) => [product.id, product])),
        [products]
    );

    const selectedEntryProduct = entryProductId
        ? productById.get(entryProductId)
        : null;

    const loadEntryLocations = useCallback(async (warehouseId: string) => {
        if (!warehouseId) {
            setEntryLocations([]);
            setEntryLocationId("none");
            return;
        }

        try {
            const locations = await getLocations({ data: { warehouseId } });
            setEntryLocations(locations);
            setEntryLocationId("none");
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load locations."
            );
        }
    }, []);

    useEffect(() => {
        loadEntryLocations(entryWarehouseId).catch(() => undefined);
    }, [entryWarehouseId, loadEntryLocations]);

    const loadStock = async () => {
        try {
            setIsLoadingStock(true);
            const response = await getStock({
                data: {
                    belowReorder,
                    pageSize: 100,
                    productId:
                        productFilter === "all" ? undefined : productFilter,
                    warehouseId:
                        warehouseFilter === "all" ? undefined : warehouseFilter,
                },
            });
            setStockData(response);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to load stock."
            );
        } finally {
            setIsLoadingStock(false);
        }
    };

    const resetEntryForm = () => {
        setEntryQuantity("");
        setEntryUnitCost("");
        setEntryBatchNumber("");
        setEntrySerialNumber("");
        setEntryExpiryDate("");
        setEntryNotes("");
        setEntryLocationId("none");
    };

    const handleCreateEntry = async () => {
        try {
            setIsSubmittingEntry(true);
            await createInitialStock({
                data: {
                    batchNumber:
                        entryBatchNumber.trim().length > 0
                            ? entryBatchNumber.trim()
                            : null,
                    expiryDate: entryExpiryDate
                        ? new Date(entryExpiryDate)
                        : null,
                    locationId:
                        entryLocationId === "none" ? null : entryLocationId,
                    notes:
                        entryNotes.trim().length > 0 ? entryNotes.trim() : null,
                    productId: entryProductId,
                    quantity: Number(entryQuantity),
                    serialNumber:
                        entrySerialNumber.trim().length > 0
                            ? entrySerialNumber.trim()
                            : null,
                    unitCost:
                        entryUnitCost.trim().length > 0
                            ? Number(entryUnitCost)
                            : null,
                    warehouseId: entryWarehouseId,
                },
            });
            toast.success("Initial stock entry created.");
            resetEntryForm();
            await loadStock();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create stock entry."
            );
        } finally {
            setIsSubmittingEntry(false);
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Stock Overview</h1>
                <p className="text-muted-foreground text-sm">
                    View stock balances and create opening stock entries.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Filters</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-4">
                    <div className="space-y-2">
                        <Label>Warehouse</Label>
                        <Select
                            onValueChange={(value) =>
                                setWarehouseFilter(value ?? "all")
                            }
                            value={warehouseFilter}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All warehouses
                                </SelectItem>
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
                        <Label>Product</Label>
                        <Select
                            onValueChange={(value) =>
                                setProductFilter(value ?? "all")
                            }
                            value={productFilter}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">
                                    All products
                                </SelectItem>
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
                    <div className="space-y-2">
                        <Label>Below Reorder</Label>
                        <Select
                            onValueChange={(value) =>
                                setBelowReorder(value === "yes")
                            }
                            value={belowReorder ? "yes" : "no"}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="no">No</SelectItem>
                                <SelectItem value="yes">Yes</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end">
                        <Button disabled={isLoadingStock} onClick={loadStock}>
                            {isLoadingStock ? "Loading..." : "Apply Filters"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Create Initial Stock Entry</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Warehouse</Label>
                            <Select
                                onValueChange={(value) =>
                                    setEntryWarehouseId(value ?? "")
                                }
                                value={entryWarehouseId}
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
                        <div className="space-y-2">
                            <Label>Product</Label>
                            <Select
                                onValueChange={(value) =>
                                    setEntryProductId(value ?? "")
                                }
                                value={entryProductId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select product" />
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
                        <div className="space-y-2">
                            <Label>Location</Label>
                            <Select
                                onValueChange={(value) =>
                                    setEntryLocationId(value ?? "none")
                                }
                                value={entryLocationId}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">
                                        No location
                                    </SelectItem>
                                    {entryLocations.map((location) => (
                                        <SelectItem
                                            key={location.id}
                                            value={location.id}
                                        >
                                            {location.code} - {location.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-quantity">Quantity</Label>
                            <Input
                                id="entry-quantity"
                                onChange={(event) =>
                                    setEntryQuantity(event.target.value)
                                }
                                placeholder="0"
                                step="0.001"
                                type="number"
                                value={entryQuantity}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-unit-cost">
                                Unit Cost (UGX)
                            </Label>
                            <Input
                                id="entry-unit-cost"
                                onChange={(event) =>
                                    setEntryUnitCost(event.target.value)
                                }
                                placeholder="0"
                                step="1"
                                type="number"
                                value={entryUnitCost}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-batch">Batch Number</Label>
                            <Input
                                id="entry-batch"
                                onChange={(event) =>
                                    setEntryBatchNumber(event.target.value)
                                }
                                value={entryBatchNumber}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-serial">Serial Number</Label>
                            <Input
                                id="entry-serial"
                                onChange={(event) =>
                                    setEntrySerialNumber(event.target.value)
                                }
                                value={entrySerialNumber}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-expiry">Expiry Date</Label>
                            <Input
                                id="entry-expiry"
                                onChange={(event) =>
                                    setEntryExpiryDate(event.target.value)
                                }
                                type="date"
                                value={entryExpiryDate}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="entry-notes">Notes</Label>
                            <Input
                                id="entry-notes"
                                onChange={(event) =>
                                    setEntryNotes(event.target.value)
                                }
                                value={entryNotes}
                            />
                        </div>
                    </div>
                    <Button
                        disabled={
                            isSubmittingEntry ||
                            !entryWarehouseId ||
                            !entryProductId ||
                            entryQuantity.trim().length === 0
                        }
                        onClick={handleCreateEntry}
                    >
                        {isSubmittingEntry
                            ? "Creating..."
                            : "Create Stock Entry"}
                    </Button>
                    {selectedEntryProduct ? (
                        <p className="text-muted-foreground text-xs">
                            Tracking required: serial (
                            {selectedEntryProduct.trackBySerialNumber
                                ? "yes"
                                : "no"}
                            ), expiry (
                            {selectedEntryProduct.trackByExpiry ? "yes" : "no"})
                            , batch (
                            {selectedEntryProduct.trackByBatch ? "yes" : "no"})
                            .
                        </p>
                    ) : null}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Stock Items</CardTitle>
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
                            {stockData.stockItems.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell>
                                        {item.product.sku} - {item.product.name}
                                    </TableCell>
                                    <TableCell>{item.warehouse.name}</TableCell>
                                    <TableCell>
                                        {item.location
                                            ? `${item.location.code} - ${item.location.name}`
                                            : "—"}
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
        </section>
    );
}
