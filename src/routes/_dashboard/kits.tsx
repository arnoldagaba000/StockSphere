import { createFileRoute } from "@tanstack/react-router";
import {
    GenealogySection,
    KitCatalogSection,
    OperationsSection,
    WarehouseToolbar,
} from "@/components/features/kits/kits-sections";
import { useKitsPageController } from "@/components/features/kits/use-kits-page-controller";
import {
    RouteErrorFallback,
    RoutePendingFallback,
} from "@/components/layout/route-feedback";
import { getWarehouses } from "@/features/inventory/get-warehouses";
import { getKitGenealogy } from "@/features/kits/get-kit-genealogy";
import { getKitStockItems } from "@/features/kits/get-kit-stock-items";
import { getKits } from "@/features/kits/get-kits";
import { getProducts } from "@/features/products/get-products";

export const Route = createFileRoute("/_dashboard/kits")({
    component: KitsPage,
    errorComponent: KitsRouteError,
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
    pendingComponent: KitsRoutePending,
});

function KitsRoutePending() {
    return (
        <RoutePendingFallback
            subtitle="Loading kits, BOMs, genealogy, and warehouse inventory."
            title="Loading Kits Workspace"
        />
    );
}

function KitsRouteError({
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
            title="Kits workspace failed to load"
            to="/"
        />
    );
}

function KitsPage() {
    const loaderData = Route.useLoaderData();
    const {
        applyGenealogyFilters,
        onAssemble,
        onDisassemble,
        onSaveBom,
        refreshKits,
        selectedKit,
        setState,
        state,
        updateSelectionDependentData,
    } = useKitsPageController(loaderData);

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
                onApplyFilters={applyGenealogyFilters}
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
                        bomItems: [
                            ...prev.bomItems,
                            {
                                componentId: "",
                                id: crypto.randomUUID(),
                                quantity: "1",
                            },
                        ],
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
