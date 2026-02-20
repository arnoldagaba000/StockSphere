import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { getWarehouses } from "@/features/inventory/get-warehouses";
import { assembleKit } from "@/features/kits/assemble-kit";
import { disassembleKit } from "@/features/kits/disassemble-kit";
import { getKitGenealogy } from "@/features/kits/get-kit-genealogy";
import { getKitStockItems } from "@/features/kits/get-kit-stock-items";
import { getKits } from "@/features/kits/get-kits";
import { setKitBom } from "@/features/kits/set-kit-bom";
import { getProducts } from "@/features/products/get-products";

const getErrorMessage = (error: unknown, fallback: string): string =>
    error instanceof Error ? error.message : fallback;

export const Route = createFileRoute("/_dashboard/kits")({
    component: KitsPage,
    loader: async () => {
        const [warehouses, productsPage] = await Promise.all([
            getWarehouses({ data: {} }),
            getProducts({ data: { isActive: true, page: 1, pageSize: 100 } }),
        ]);
        const selectedWarehouseId = warehouses[0]?.id;
        const kits = selectedWarehouseId
            ? await getKits({ data: { warehouseId: selectedWarehouseId } })
            : [];
        const initialKitId = kits[0]?.kitId;
        const [genealogy, kitStockItems] =
            selectedWarehouseId && initialKitId
                ? await Promise.all([
                      getKitGenealogy({
                          data: {
                              kitId: initialKitId,
                              limit: 20,
                              warehouseId: selectedWarehouseId,
                          },
                      }),
                      getKitStockItems({
                          data: {
                              kitId: initialKitId,
                              warehouseId: selectedWarehouseId,
                          },
                      }),
                  ])
                : [[], []];

        return {
            genealogy,
            kitStockItems,
            kits,
            products: productsPage.products,
            selectedWarehouseId,
            warehouses,
        };
    },
});

type LoaderData = ReturnType<typeof Route.useLoaderData>;
type KitsData = Awaited<ReturnType<typeof getKits>>;
type KitGenealogyData = Awaited<ReturnType<typeof getKitGenealogy>>;
type KitStockItemsData = Awaited<ReturnType<typeof getKitStockItems>>;
type WarehouseOption = LoaderData["warehouses"][number];
type ProductOption = LoaderData["products"][number];

interface BomItemState {
    componentId: string;
    id: string;
    quantity: string;
}

interface KitsPageState {
    assemblyNotes: string;
    assemblyQuantity: string;
    bomItems: BomItemState[];
    disassemblyNotes: string;
    disassemblyQuantity: string;
    disassemblyStockItemId: string;
    genealogy: KitGenealogyData;
    genealogyBatch: string;
    genealogyDateFrom: string;
    genealogyDateTo: string;
    kitId: string;
    kitStockItems: KitStockItemsData;
    kits: KitsData;
    warehouseId: string;
}

type KitsPageAction =
    | Partial<KitsPageState>
    | ((state: KitsPageState) => Partial<KitsPageState>);

const kitsPageReducer = (
    state: KitsPageState,
    action: KitsPageAction
): KitsPageState => {
    const patch = typeof action === "function" ? action(state) : action;
    return { ...state, ...patch };
};

const createBomItem = (): BomItemState => ({
    componentId: "",
    id: crypto.randomUUID(),
    quantity: "1",
});

function KitsPage() {
    const loaderData = Route.useLoaderData();
    const [state, setState] = useReducer(kitsPageReducer, {
        assemblyNotes: "",
        assemblyQuantity: "1",
        bomItems: [createBomItem()],
        disassemblyNotes: "",
        disassemblyQuantity: "1",
        disassemblyStockItemId: loaderData.kitStockItems[0]?.stockItemId ?? "",
        genealogy: loaderData.genealogy,
        genealogyBatch: "",
        genealogyDateFrom: "",
        genealogyDateTo: "",
        kitId: loaderData.kits[0]?.kitId ?? "",
        kitStockItems: loaderData.kitStockItems,
        kits: loaderData.kits,
        warehouseId: loaderData.selectedWarehouseId ?? "",
    });

    const selectedKit = useMemo(
        () => state.kits.find((entry) => entry.kitId === state.kitId) ?? null,
        [state.kitId, state.kits]
    );

    const fetchGenealogy = async (
        nextKitId: string,
        nextWarehouseId: string
    ): Promise<KitGenealogyData> => {
        if (!(nextKitId && nextWarehouseId)) {
            return [];
        }

        return await getKitGenealogy({
            data: {
                batchNumber: state.genealogyBatch || undefined,
                dateFrom: state.genealogyDateFrom
                    ? new Date(`${state.genealogyDateFrom}T00:00:00.000Z`)
                    : undefined,
                dateTo: state.genealogyDateTo
                    ? new Date(`${state.genealogyDateTo}T23:59:59.999Z`)
                    : undefined,
                kitId: nextKitId,
                limit: 20,
                warehouseId: nextWarehouseId,
            },
        });
    };

    const updateSelectionDependentData = async (
        nextKitId: string,
        nextWarehouseId: string
    ): Promise<void> => {
        if (!(nextWarehouseId && nextKitId)) {
            setState({ genealogy: [], kitStockItems: [] });
            return;
        }

        const [nextGenealogy, nextKitStockItems] = await Promise.all([
            fetchGenealogy(nextKitId, nextWarehouseId),
            getKitStockItems({
                data: {
                    kitId: nextKitId,
                    warehouseId: nextWarehouseId,
                },
            }),
        ]);

        setState({
            disassemblyStockItemId: nextKitStockItems[0]?.stockItemId ?? "",
            genealogy: nextGenealogy,
            kitStockItems: nextKitStockItems,
        });
    };

    const refreshKits = async () => {
        if (!state.warehouseId) {
            setState({ genealogy: [], kitStockItems: [], kits: [] });
            return;
        }

        const stockItemsPromise = state.kitId
            ? getKitStockItems({
                  data: {
                      kitId: state.kitId,
                      warehouseId: state.warehouseId,
                  },
              })
            : Promise.resolve([]);

        await Promise.all([
            getKits({ data: { warehouseId: state.warehouseId } }),
            fetchGenealogy(state.kitId, state.warehouseId),
            stockItemsPromise,
        ])
            .then(([nextKits, nextGenealogy, nextKitStockItems]) => {
                const nextKitId = nextKits.some(
                    (entry) => entry.kitId === state.kitId
                )
                    ? state.kitId
                    : (nextKits[0]?.kitId ?? "");

                setState({
                    genealogy: nextGenealogy,
                    kitId: nextKitId,
                    kitStockItems: nextKitStockItems,
                    kits: nextKits,
                });
            })
            .catch((error: unknown) => {
                toast.error(getErrorMessage(error, "Failed to load kits."));
            });
    };

    const onSaveBom = async () => {
        if (!state.kitId) {
            toast.error("Select a kit first.");
            return;
        }

        const normalizedComponents = state.bomItems
            .filter((item) => item.componentId.trim().length > 0)
            .map((item) => ({
                componentId: item.componentId,
                quantity: Number(item.quantity),
            }))
            .filter(
                (item) => Number.isFinite(item.quantity) && item.quantity > 0
            );

        if (normalizedComponents.length === 0) {
            toast.error("At least one valid BOM component is required.");
            return;
        }

        try {
            await setKitBom({
                data: {
                    components: normalizedComponents,
                    kitId: state.kitId,
                },
            });
            await refreshKits();
            toast.success("Kit BOM saved.");
        } catch (error) {
            toast.error(getErrorMessage(error, "Failed to save BOM."));
        }
    };

    const onAssemble = async () => {
        if (!(state.kitId && state.warehouseId)) {
            toast.error("Select a warehouse and kit first.");
            return;
        }

        const quantity = Number(state.assemblyQuantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            toast.error("Assembly quantity must be greater than zero.");
            return;
        }

        const normalizedAssemblyNotes = state.assemblyNotes || undefined;
        try {
            const result = await assembleKit({
                data: {
                    kitId: state.kitId,
                    notes: normalizedAssemblyNotes,
                    quantity,
                    warehouseId: state.warehouseId,
                },
            });
            await refreshKits();
            toast.success(`Assembled ${result.assembledQuantity} kit unit(s).`);
        } catch (error) {
            toast.error(getErrorMessage(error, "Assembly failed."));
        }
    };

    const onDisassemble = async () => {
        if (!state.disassemblyStockItemId) {
            toast.error("Enter a kit stock item ID.");
            return;
        }

        const quantity = Number(state.disassemblyQuantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            toast.error("Disassembly quantity must be greater than zero.");
            return;
        }

        const normalizedDisassemblyNotes = state.disassemblyNotes || undefined;
        try {
            const result = await disassembleKit({
                data: {
                    kitStockItemId: state.disassemblyStockItemId,
                    notes: normalizedDisassemblyNotes,
                    quantity,
                },
            });
            await refreshKits();
            toast.success(
                `Disassembled ${result.disassembledQuantity} kit unit(s).`
            );
        } catch (error) {
            toast.error(getErrorMessage(error, "Disassembly failed."));
        }
    };

    return (
        <section className="space-y-4">
            <WarehouseToolbar
                onRefresh={refreshKits}
                onWarehouseChange={(warehouseId) => setState({ warehouseId })}
                warehouseId={state.warehouseId}
                warehouses={loaderData.warehouses}
            />

            <KitCatalogSection
                kits={state.kits}
                onSelect={async (nextKitId) => {
                    setState({ kitId: nextKitId });
                    await updateSelectionDependentData(
                        nextKitId,
                        state.warehouseId
                    );
                }}
                selectedKit={selectedKit}
                selectedKitId={state.kitId}
            />

            <GenealogySection
                genealogy={state.genealogy}
                genealogyBatch={state.genealogyBatch}
                genealogyDateFrom={state.genealogyDateFrom}
                genealogyDateTo={state.genealogyDateTo}
                onApplyFilters={async () => {
                    const genealogy = await fetchGenealogy(
                        state.kitId,
                        state.warehouseId
                    );
                    setState({ genealogy });
                }}
                onGenealogyBatchChange={(genealogyBatch) =>
                    setState({ genealogyBatch })
                }
                onGenealogyDateFromChange={(genealogyDateFrom) =>
                    setState({ genealogyDateFrom })
                }
                onGenealogyDateToChange={(genealogyDateTo) =>
                    setState({ genealogyDateTo })
                }
            />

            <OperationsSection
                assemblyNotes={state.assemblyNotes}
                assemblyQuantity={state.assemblyQuantity}
                bomItems={state.bomItems}
                disassemblyNotes={state.disassemblyNotes}
                disassemblyQuantity={state.disassemblyQuantity}
                disassemblyStockItemId={state.disassemblyStockItemId}
                kitStockItems={state.kitStockItems}
                kits={state.kits}
                onAddBomRow={() =>
                    setState((prev) => ({
                        bomItems: [...prev.bomItems, createBomItem()],
                    }))
                }
                onAssemble={onAssemble}
                onAssemblyNotesChange={(assemblyNotes) =>
                    setState({ assemblyNotes })
                }
                onAssemblyQuantityChange={(assemblyQuantity) =>
                    setState({ assemblyQuantity })
                }
                onBomItemChange={(index, patch) =>
                    setState((prev) => {
                        const nextBomItems = [...prev.bomItems];
                        nextBomItems[index] = {
                            ...nextBomItems[index],
                            ...patch,
                        };
                        return { bomItems: nextBomItems };
                    })
                }
                onDisassemble={onDisassemble}
                onDisassemblyNotesChange={(disassemblyNotes) =>
                    setState({ disassemblyNotes })
                }
                onDisassemblyQuantityChange={(disassemblyQuantity) =>
                    setState({ disassemblyQuantity })
                }
                onDisassemblyStockItemIdChange={(disassemblyStockItemId) =>
                    setState({ disassemblyStockItemId })
                }
                onKitChange={async (kitId) => {
                    setState({ kitId });
                    await updateSelectionDependentData(
                        kitId,
                        state.warehouseId
                    );
                }}
                onSaveBom={onSaveBom}
                products={loaderData.products}
                selectedKitId={state.kitId}
            />
        </section>
    );
}

function WarehouseToolbar({
    onRefresh,
    onWarehouseChange,
    warehouses,
    warehouseId,
}: {
    onRefresh: () => Promise<void>;
    onWarehouseChange: (warehouseId: string) => void;
    warehouses: LoaderData["warehouses"];
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
                        {warehouses.map((warehouse: WarehouseOption) => (
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

function KitCatalogSection({
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

function GenealogySection({
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

function OperationsSection({
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
    products: LoaderData["products"];
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
                                    {products.map((product: ProductOption) => (
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
