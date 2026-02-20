import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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
import { getKits } from "@/features/kits/get-kits";
import { setKitBom } from "@/features/kits/set-kit-bom";
import { getProducts } from "@/features/products/get-products";

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

        return {
            kits,
            products: productsPage.products,
            selectedWarehouseId,
            warehouses,
        };
    },
});

interface BomItemState {
    componentId: string;
    quantity: string;
}

function KitsPage() {
    const loaderData = Route.useLoaderData();
    const [kits, setKits] = useState(loaderData.kits);
    const [warehouseId, setWarehouseId] = useState(
        loaderData.selectedWarehouseId ?? ""
    );
    const [kitId, setKitId] = useState(loaderData.kits[0]?.kitId ?? "");
    const [bomItems, setBomItems] = useState<BomItemState[]>([
        { componentId: "", quantity: "1" },
    ]);
    const [assemblyQuantity, setAssemblyQuantity] = useState("1");
    const [assemblyNotes, setAssemblyNotes] = useState("");
    const [disassemblyStockItemId, setDisassemblyStockItemId] = useState("");
    const [disassemblyQuantity, setDisassemblyQuantity] = useState("1");
    const [disassemblyNotes, setDisassemblyNotes] = useState("");

    const selectedKit = useMemo(
        () => kits.find((entry) => entry.kitId === kitId) ?? null,
        [kitId, kits]
    );

    const refreshKits = async () => {
        if (!warehouseId) {
            setKits([]);
            return;
        }
        try {
            const nextKits = await getKits({ data: { warehouseId } });
            setKits(nextKits);
            if (!nextKits.some((entry) => entry.kitId === kitId)) {
                setKitId(nextKits[0]?.kitId ?? "");
            }
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to load kits."
            );
        }
    };

    const onSaveBom = async () => {
        if (!kitId) {
            toast.error("Select a kit first.");
            return;
        }

        const normalizedComponents = bomItems
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
                    kitId,
                },
            });
            await refreshKits();
            toast.success("Kit BOM saved.");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Failed to save BOM."
            );
        }
    };

    const onAssemble = async () => {
        if (!(kitId && warehouseId)) {
            toast.error("Select a warehouse and kit first.");
            return;
        }

        const quantity = Number(assemblyQuantity);
        if (!Number.isFinite(quantity) || quantity <= 0) {
            toast.error("Assembly quantity must be greater than zero.");
            return;
        }

        try {
            const result = await assembleKit({
                data: {
                    kitId,
                    notes: assemblyNotes || undefined,
                    quantity,
                    warehouseId,
                },
            });
            await refreshKits();
            toast.success(`Assembled ${result.assembledQuantity} kit unit(s).`);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Assembly failed."
            );
        }
    };

    const onDisassemble = async () => {
        const quantity = Number(disassemblyQuantity);
        if (!disassemblyStockItemId) {
            toast.error("Enter a kit stock item ID.");
            return;
        }
        if (!Number.isFinite(quantity) || quantity <= 0) {
            toast.error("Disassembly quantity must be greater than zero.");
            return;
        }

        try {
            const result = await disassembleKit({
                data: {
                    kitStockItemId: disassemblyStockItemId,
                    notes: disassemblyNotes || undefined,
                    quantity,
                },
            });
            await refreshKits();
            toast.success(
                `Disassembled ${result.disassembledQuantity} kit unit(s).`
            );
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Disassembly failed."
            );
        }
    };

    return (
        <section className="space-y-4">
            <div className="flex flex-wrap items-end gap-3">
                <div className="space-y-1">
                    <Label htmlFor="kit-warehouse">Warehouse</Label>
                    <Select
                        onValueChange={(value) => setWarehouseId(value ?? "")}
                        value={warehouseId}
                    >
                        <SelectTrigger id="kit-warehouse">
                            <SelectValue placeholder="Select warehouse" />
                        </SelectTrigger>
                        <SelectContent>
                            {loaderData.warehouses.map((warehouse) => (
                                <SelectItem
                                    key={warehouse.id}
                                    value={warehouse.id}
                                >
                                    {warehouse.name} ({warehouse.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Button onClick={refreshKits} type="button" variant="outline">
                    Refresh
                </Button>
            </div>

            <div className="grid gap-4 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Kit Catalog</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {kits.length === 0 ? (
                            <p className="text-muted-foreground text-sm">
                                No kits found. Mark a product as kit and define
                                BOM.
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
                                            onClick={() =>
                                                setKitId(entry.kitId)
                                            }
                                            size="sm"
                                            type="button"
                                            variant={
                                                entry.kitId === kitId
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

            <div className="grid gap-4 xl:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle>BOM Editor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="space-y-1">
                            <Label htmlFor="bom-kit">Kit Product</Label>
                            <Select
                                onValueChange={(value) => setKitId(value ?? "")}
                                value={kitId}
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
                            <div
                                className="grid grid-cols-12 gap-2"
                                key={`${item.componentId}-${index}`}
                            >
                                <Select
                                    onValueChange={(value) => {
                                        const next = [...bomItems];
                                        next[index] = {
                                            ...next[index],
                                            componentId: value ?? "",
                                        };
                                        setBomItems(next);
                                    }}
                                    value={item.componentId}
                                >
                                    <SelectTrigger className="col-span-8">
                                        <SelectValue placeholder="Component" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {loaderData.products.map((product) => (
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
                                    onChange={(event) => {
                                        const next = [...bomItems];
                                        next[index] = {
                                            ...next[index],
                                            quantity: event.target.value,
                                        };
                                        setBomItems(next);
                                    }}
                                    step={0.001}
                                    type="number"
                                    value={item.quantity}
                                />
                            </div>
                        ))}

                        <div className="flex gap-2">
                            <Button
                                onClick={() =>
                                    setBomItems((prev) => [
                                        ...prev,
                                        { componentId: "", quantity: "1" },
                                    ])
                                }
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
                                    setAssemblyQuantity(event.target.value)
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
                                    setAssemblyNotes(event.target.value)
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
                                Kit Stock Item ID
                            </Label>
                            <Input
                                id="disassembly-stock-item-id"
                                onChange={(event) =>
                                    setDisassemblyStockItemId(
                                        event.target.value
                                    )
                                }
                                value={disassemblyStockItemId}
                            />
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="disassembly-qty">Quantity</Label>
                            <Input
                                id="disassembly-qty"
                                min={0.001}
                                onChange={(event) =>
                                    setDisassemblyQuantity(event.target.value)
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
                                    setDisassemblyNotes(event.target.value)
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
        </section>
    );
}
