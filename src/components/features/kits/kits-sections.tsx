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
import { Textarea } from "@/components/ui/textarea";
import type { getWarehouses } from "@/features/inventory/get-warehouses";
import type { getKitGenealogy } from "@/features/kits/get-kit-genealogy";
import type { getKitStockItems } from "@/features/kits/get-kit-stock-items";
import type { getKits } from "@/features/kits/get-kits";
import type { getProducts } from "@/features/products/get-products";

type KitsData = Awaited<ReturnType<typeof getKits>>;
type KitGenealogyData = Awaited<ReturnType<typeof getKitGenealogy>>;
type KitStockItemsData = Awaited<ReturnType<typeof getKitStockItems>>;
type WarehouseOption = Awaited<ReturnType<typeof getWarehouses>>[number];
type ProductOption = Awaited<
    ReturnType<typeof getProducts>
>["products"][number];

export interface BomItemState {
    componentId: string;
    id: string;
    quantity: string;
}

export function WarehouseToolbar({
    onRefresh,
    onWarehouseChange,
    warehouses,
    warehouseId,
}: {
    onRefresh: () => Promise<void>;
    onWarehouseChange: (warehouseId: string) => void;
    warehouses: WarehouseOption[];
    warehouseId: string;
}) {
    return (
        <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
                <Label htmlFor="kit-warehouse">Warehouse</Label>
                <Select
                    onValueChange={(value) => onWarehouseChange(value ?? "")}
                    value={warehouseId}
                >
                    <SelectTrigger id="kit-warehouse">
                        <SelectValue placeholder="Select warehouse" />
                    </SelectTrigger>
                    <SelectContent>
                        {warehouses.map((warehouse) => (
                            <SelectItem key={warehouse.id} value={warehouse.id}>
                                {warehouse.name} ({warehouse.code})
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <Button onClick={onRefresh} type="button" variant="outline">
                Refresh
            </Button>
        </div>
    );
}

export function KitCatalogSection({
    kits,
    onSelect,
    selectedKit,
    selectedKitId,
}: {
    kits: KitsData;
    onSelect: (kitId: string) => Promise<void>;
    selectedKit: KitsData[number] | null;
    selectedKitId: string;
}) {
    return (
        <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
                <CardHeader>
                    <CardTitle>Kit Catalog</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    {kits.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            No kits found. Mark a product as kit and define BOM.
                        </p>
                    ) : (
                        kits.map((entry) => (
                            <article
                                className="rounded-md border p-3"
                                key={entry.kitId}
                            >
                                <div className="flex items-center justify-between">
                                    <h3 className="font-medium">
                                        {entry.kitName}
                                    </h3>
                                    <Button
                                        onClick={async () =>
                                            await onSelect(entry.kitId)
                                        }
                                        size="sm"
                                        type="button"
                                        variant={
                                            entry.kitId === selectedKitId
                                                ? "default"
                                                : "outline"
                                        }
                                    >
                                        Select
                                    </Button>
                                </div>
                                <p className="text-muted-foreground text-xs">
                                    {entry.kitSku} • On hand:{" "}
                                    {entry.onHandQuantity} • Can assemble:{" "}
                                    {entry.assemblableUnits}
                                </p>
                            </article>
                        ))
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Selected Kit</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    {selectedKit ? (
                        <>
                            <p>
                                <span className="font-medium">
                                    {selectedKit.kitName}
                                </span>{" "}
                                ({selectedKit.kitSku})
                            </p>
                            {selectedKit.bom.length === 0 ? (
                                <p className="text-muted-foreground">
                                    No BOM components.
                                </p>
                            ) : (
                                selectedKit.bom.map((component) => (
                                    <p key={component.componentId}>
                                        {component.componentSku}:{" "}
                                        {component.quantityPerKit} per kit
                                        (available{" "}
                                        {component.availableComponentQty})
                                    </p>
                                ))
                            )}
                        </>
                    ) : (
                        <p className="text-muted-foreground">
                            No kit selected.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export function GenealogySection({
    genealogy,
    genealogyBatch,
    genealogyDateFrom,
    genealogyDateTo,
    onApplyFilters,
    onGenealogyBatchChange,
    onGenealogyDateFromChange,
    onGenealogyDateToChange,
}: {
    genealogy: KitGenealogyData;
    genealogyBatch: string;
    genealogyDateFrom: string;
    genealogyDateTo: string;
    onApplyFilters: () => Promise<void>;
    onGenealogyBatchChange: (value: string) => void;
    onGenealogyDateFromChange: (value: string) => void;
    onGenealogyDateToChange: (value: string) => void;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Batch Genealogy</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-2 md:grid-cols-4">
                    <Input
                        onChange={(event) =>
                            onGenealogyBatchChange(event.target.value)
                        }
                        placeholder="Batch number"
                        value={genealogyBatch}
                    />
                    <Input
                        onChange={(event) =>
                            onGenealogyDateFromChange(event.target.value)
                        }
                        type="date"
                        value={genealogyDateFrom}
                    />
                    <Input
                        onChange={(event) =>
                            onGenealogyDateToChange(event.target.value)
                        }
                        type="date"
                        value={genealogyDateTo}
                    />
                    <Button
                        onClick={onApplyFilters}
                        type="button"
                        variant="outline"
                    >
                        Apply Filters
                    </Button>
                </div>
                {genealogy.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        No assembly genealogy records for current filters.
                    </p>
                ) : (
                    genealogy.map((entry) => (
                        <article
                            className="space-y-2 rounded-md border p-3"
                            key={`${entry.transactionNumber}-${entry.assembledAt.toString()}`}
                        >
                            <div className="text-sm">
                                <p>
                                    <span className="font-medium">Txn:</span>{" "}
                                    {entry.transactionNumber}
                                </p>
                                <p>
                                    <span className="font-medium">
                                        Warehouse:
                                    </span>{" "}
                                    {entry.warehouse}
                                </p>
                                <p>
                                    <span className="font-medium">
                                        Assembled:
                                    </span>{" "}
                                    {entry.assembledQuantity} | Batch:{" "}
                                    {entry.assembledBatchNumber ?? "—"} |
                                    Serial: {entry.assembledSerialNumber ?? "—"}
                                </p>
                            </div>
                            <div className="space-y-1 text-xs">
                                {entry.consumedComponents.map((component) => (
                                    <p
                                        key={`${entry.transactionNumber}-${component.componentId}-${component.batchNumber ?? "na"}-${component.serialNumber ?? "na"}`}
                                    >
                                        {component.componentSku} • qty{" "}
                                        {component.quantity} • batch{" "}
                                        {component.batchNumber ?? "—"} • serial{" "}
                                        {component.serialNumber ?? "—"}
                                    </p>
                                ))}
                            </div>
                        </article>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

export function OperationsSection({
    assemblyNotes,
    assemblyQuantity,
    bomItems,
    disassemblyNotes,
    disassemblyQuantity,
    disassemblyStockItemId,
    kits,
    kitStockItems,
    onAddBomRow,
    onAssemble,
    onAssemblyNotesChange,
    onAssemblyQuantityChange,
    onBomItemChange,
    onDisassemble,
    onDisassemblyNotesChange,
    onDisassemblyQuantityChange,
    onDisassemblyStockItemIdChange,
    onKitChange,
    onSaveBom,
    products,
    selectedKitId,
}: {
    assemblyNotes: string;
    assemblyQuantity: string;
    bomItems: BomItemState[];
    disassemblyNotes: string;
    disassemblyQuantity: string;
    disassemblyStockItemId: string;
    kits: KitsData;
    kitStockItems: KitStockItemsData;
    onAddBomRow: () => void;
    onAssemble: () => Promise<void>;
    onAssemblyNotesChange: (value: string) => void;
    onAssemblyQuantityChange: (value: string) => void;
    onBomItemChange: (index: number, patch: Partial<BomItemState>) => void;
    onDisassemble: () => Promise<void>;
    onDisassemblyNotesChange: (value: string) => void;
    onDisassemblyQuantityChange: (value: string) => void;
    onDisassemblyStockItemIdChange: (value: string) => void;
    onKitChange: (kitId: string) => Promise<void>;
    onSaveBom: () => Promise<void>;
    products: ProductOption[];
    selectedKitId: string;
}) {
    return (
        <div className="grid gap-4 xl:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle>BOM Editor</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="space-y-1">
                        <Label htmlFor="bom-kit">Kit Product</Label>
                        <Select
                            onValueChange={async (value) =>
                                await onKitChange(value ?? "")
                            }
                            value={selectedKitId}
                        >
                            <SelectTrigger id="bom-kit">
                                <SelectValue placeholder="Select kit" />
                            </SelectTrigger>
                            <SelectContent>
                                {kits.map((entry) => (
                                    <SelectItem
                                        key={entry.kitId}
                                        value={entry.kitId}
                                    >
                                        {entry.kitName} ({entry.kitSku})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {bomItems.map((item, index) => (
                        <div className="grid grid-cols-12 gap-2" key={item.id}>
                            <Select
                                onValueChange={(value) =>
                                    onBomItemChange(index, {
                                        componentId: value ?? "",
                                    })
                                }
                                value={item.componentId}
                            >
                                <SelectTrigger className="col-span-8">
                                    <SelectValue placeholder="Component" />
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
                                className="col-span-4"
                                min={0.001}
                                onChange={(event) =>
                                    onBomItemChange(index, {
                                        quantity: event.target.value,
                                    })
                                }
                                step={0.001}
                                type="number"
                                value={item.quantity}
                            />
                        </div>
                    ))}

                    <div className="flex gap-2">
                        <Button
                            onClick={onAddBomRow}
                            type="button"
                            variant="outline"
                        >
                            Add Row
                        </Button>
                        <Button onClick={onSaveBom} type="button">
                            Save BOM
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Assemble</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="space-y-1">
                        <Label htmlFor="assembly-qty">Quantity</Label>
                        <Input
                            id="assembly-qty"
                            min={0.001}
                            onChange={(event) =>
                                onAssemblyQuantityChange(event.target.value)
                            }
                            step={0.001}
                            type="number"
                            value={assemblyQuantity}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="assembly-notes">Notes</Label>
                        <Textarea
                            id="assembly-notes"
                            onChange={(event) =>
                                onAssemblyNotesChange(event.target.value)
                            }
                            rows={4}
                            value={assemblyNotes}
                        />
                    </div>
                    <Button onClick={onAssemble} type="button">
                        Assemble Kit
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Disassemble</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    <div className="space-y-1">
                        <Label htmlFor="disassembly-stock-item-id">
                            Kit Stock Item
                        </Label>
                        <Select
                            onValueChange={(value) =>
                                onDisassemblyStockItemIdChange(value ?? "")
                            }
                            value={disassemblyStockItemId}
                        >
                            <SelectTrigger id="disassembly-stock-item-id">
                                <SelectValue placeholder="Select kit stock row" />
                            </SelectTrigger>
                            <SelectContent>
                                {kitStockItems.map((row) => (
                                    <SelectItem
                                        key={row.stockItemId}
                                        value={row.stockItemId}
                                    >
                                        {row.stockItemId.slice(0, 8)}... | qty{" "}
                                        {row.availableQuantity} | batch{" "}
                                        {row.batchNumber ?? "—"} | serial{" "}
                                        {row.serialNumber ?? "—"}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="disassembly-qty">Quantity</Label>
                        <Input
                            id="disassembly-qty"
                            min={0.001}
                            onChange={(event) =>
                                onDisassemblyQuantityChange(event.target.value)
                            }
                            step={0.001}
                            type="number"
                            value={disassemblyQuantity}
                        />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="disassembly-notes">Notes</Label>
                        <Textarea
                            id="disassembly-notes"
                            onChange={(event) =>
                                onDisassemblyNotesChange(event.target.value)
                            }
                            rows={3}
                            value={disassemblyNotes}
                        />
                    </div>
                    <Button
                        onClick={onDisassemble}
                        type="button"
                        variant="outline"
                    >
                        Disassemble Kit
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
