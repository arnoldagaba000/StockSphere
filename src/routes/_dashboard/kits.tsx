import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import type { BomItemState } from "@/components/features/kits/kits-sections";
import {
    GenealogySection,
    KitCatalogSection,
    OperationsSection,
    WarehouseToolbar,
} from "@/components/features/kits/kits-sections";
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

type KitsData = Awaited<ReturnType<typeof getKits>>;
type KitGenealogyData = Awaited<ReturnType<typeof getKitGenealogy>>;
type KitStockItemsData = Awaited<ReturnType<typeof getKitStockItems>>;

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
