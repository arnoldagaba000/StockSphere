import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createWarehouse } from "@/features/inventory/create-warehouse";
import { getWarehouses } from "@/features/inventory/get-warehouses";
import {
    archiveWarehouse,
    updateWarehouse,
} from "@/features/inventory/update-warehouse";

export const Route = createFileRoute("/_dashboard/warehouses")({
    component: WarehousesPage,
    loader: () => getWarehouses({ data: {} }),
});

const SHORT_ID_LENGTH = 8;

type WarehouseStatusFilter = "active" | "all" | "inactive";

interface WarehousesPageState {
    address: string;
    code: string;
    country: string;
    district: string;
    isActive: boolean;
    isSubmitting: boolean;
    isUpdatingId: string | null;
    listSearchQuery: string;
    listStatusFilter: WarehouseStatusFilter;
    name: string;
    postalCode: string;
}

type WarehousesPageAction =
    | Partial<WarehousesPageState>
    | ((state: WarehousesPageState) => Partial<WarehousesPageState>);

const warehousesPageReducer = (
    state: WarehousesPageState,
    action: WarehousesPageAction
): WarehousesPageState => {
    const patch = typeof action === "function" ? action(state) : action;
    return { ...state, ...patch };
};

type WarehousesList = Awaited<ReturnType<typeof getWarehouses>>;

interface CreateWarehouseCardProps {
    onCreateWarehouse: () => void;
    onPatchState: (action: WarehousesPageAction) => void;
    state: WarehousesPageState;
}

const CreateWarehouseCard = ({
    onCreateWarehouse,
    onPatchState,
    state,
}: CreateWarehouseCardProps) => {
    return (
        <Card className="border-border/70">
            <CardHeader className="space-y-1">
                <CardTitle>Create Warehouse</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Register a warehouse before assigning locations and stock
                    operations.
                </p>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="warehouse-code">Code</Label>
                        <Input
                            id="warehouse-code"
                            onChange={(event) =>
                                onPatchState({
                                    code: event.target.value.toUpperCase(),
                                })
                            }
                            placeholder="WH-KLA-01"
                            value={state.code}
                        />
                        <p className="text-muted-foreground text-xs">
                            Use a short, stable code for reporting and lookup.
                        </p>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="warehouse-name">Name</Label>
                        <Input
                            id="warehouse-name"
                            onChange={(event) =>
                                onPatchState({ name: event.target.value })
                            }
                            placeholder="Kampala Main Warehouse"
                            value={state.name}
                        />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="warehouse-address">Address</Label>
                        <Input
                            id="warehouse-address"
                            onChange={(event) =>
                                onPatchState({ address: event.target.value })
                            }
                            placeholder="Physical address"
                            value={state.address}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="warehouse-district">District</Label>
                        <Input
                            id="warehouse-district"
                            onChange={(event) =>
                                onPatchState({ district: event.target.value })
                            }
                            value={state.district}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="warehouse-postal">Postal Code</Label>
                        <Input
                            id="warehouse-postal"
                            onChange={(event) =>
                                onPatchState({ postalCode: event.target.value })
                            }
                            value={state.postalCode}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="warehouse-country">Country</Label>
                        <Input
                            id="warehouse-country"
                            onChange={(event) =>
                                onPatchState({ country: event.target.value })
                            }
                            value={state.country}
                        />
                    </div>
                    <div className="flex items-end gap-2 pb-2">
                        <Switch
                            checked={state.isActive}
                            id="warehouse-active"
                            onCheckedChange={(checked) =>
                                onPatchState({ isActive: checked })
                            }
                        />
                        <Label htmlFor="warehouse-active">Active</Label>
                    </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <p className="text-muted-foreground text-xs">
                        Warehouse IDs are generated automatically.
                    </p>
                    <Button
                        disabled={
                            state.isSubmitting ||
                            state.code.trim().length === 0 ||
                            state.name.trim().length === 0
                        }
                        onClick={onCreateWarehouse}
                    >
                        {state.isSubmitting
                            ? "Creating..."
                            : "Create Warehouse"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
};

interface WarehouseListCardProps {
    isUpdatingId: string | null;
    onArchiveWarehouse: (warehouseId: string) => void;
    onSearchChange: (searchQuery: string) => void;
    onStatusFilterChange: (statusFilter: WarehouseStatusFilter) => void;
    onToggleWarehouseActive: (warehouseId: string, isActive: boolean) => void;
    searchQuery: string;
    statusFilter: WarehouseStatusFilter;
    warehouses: WarehousesList;
}

const WarehouseListCard = ({
    isUpdatingId,
    onArchiveWarehouse,
    onSearchChange,
    onStatusFilterChange,
    onToggleWarehouseActive,
    searchQuery,
    statusFilter,
    warehouses,
}: WarehouseListCardProps) => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const filteredWarehouses = useMemo(() => {
        return warehouses.filter((warehouse) => {
            let statusMatches = true;
            if (statusFilter === "active") {
                statusMatches = warehouse.isActive;
            } else if (statusFilter === "inactive") {
                statusMatches = !warehouse.isActive;
            }

            const searchMatches =
                normalizedSearchQuery.length === 0
                    ? true
                    : [
                          warehouse.code,
                          warehouse.name,
                          warehouse.country,
                          warehouse.district ?? "",
                          warehouse.id,
                      ].some((value) =>
                          value.toLowerCase().includes(normalizedSearchQuery)
                      );

            return statusMatches && searchMatches;
        });
    }, [normalizedSearchQuery, statusFilter, warehouses]);

    const activeCount = filteredWarehouses.filter(
        (warehouse) => warehouse.isActive
    ).length;

    return (
        <Card className="border-border/70">
            <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle>Manage Warehouses</CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Filter and manage operational warehouses.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">
                            Visible: {filteredWarehouses.length}
                        </Badge>
                        <Badge variant="outline">Active: {activeCount}</Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                        <Label htmlFor="warehouse-search">Search</Label>
                        <Input
                            id="warehouse-search"
                            onChange={(event) => {
                                onSearchChange(event.target.value);
                            }}
                            placeholder="Code, name, country, district..."
                            value={searchQuery}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Status Filter</Label>
                        <div className="grid grid-cols-3 gap-2">
                            <Button
                                onClick={() => {
                                    onStatusFilterChange("all");
                                }}
                                size="sm"
                                variant={
                                    statusFilter === "all"
                                        ? "default"
                                        : "outline"
                                }
                            >
                                All
                            </Button>
                            <Button
                                onClick={() => {
                                    onStatusFilterChange("active");
                                }}
                                size="sm"
                                variant={
                                    statusFilter === "active"
                                        ? "default"
                                        : "outline"
                                }
                            >
                                Active
                            </Button>
                            <Button
                                onClick={() => {
                                    onStatusFilterChange("inactive");
                                }}
                                size="sm"
                                variant={
                                    statusFilter === "inactive"
                                        ? "default"
                                        : "outline"
                                }
                            >
                                Inactive
                            </Button>
                        </div>
                    </div>
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[940px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>District</TableHead>
                                <TableHead>Country</TableHead>
                                <TableHead>Locations</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredWarehouses.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={8}
                                    >
                                        No warehouses match your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredWarehouses.map((warehouse) => (
                                    <TableRow key={warehouse.id}>
                                        <TableCell className="font-medium">
                                            {warehouse.code}
                                        </TableCell>
                                        <TableCell>{warehouse.name}</TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {warehouse.id.slice(
                                                0,
                                                SHORT_ID_LENGTH
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {warehouse.district ?? "—"}
                                        </TableCell>
                                        <TableCell>
                                            {warehouse.country}
                                        </TableCell>
                                        <TableCell>
                                            {warehouse._count.locations}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    warehouse.isActive
                                                        ? "secondary"
                                                        : "ghost"
                                                }
                                            >
                                                {warehouse.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex flex-wrap justify-end gap-2">
                                                <Button
                                                    disabled={
                                                        isUpdatingId ===
                                                        warehouse.id
                                                    }
                                                    onClick={() =>
                                                        onToggleWarehouseActive(
                                                            warehouse.id,
                                                            warehouse.isActive
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    {warehouse.isActive
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </Button>
                                                <Button
                                                    disabled={
                                                        isUpdatingId ===
                                                        warehouse.id
                                                    }
                                                    onClick={() =>
                                                        onArchiveWarehouse(
                                                            warehouse.id
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    Archive
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

function WarehousesPage() {
    const router = useRouter();
    const warehouses = Route.useLoaderData();
    const [state, setState] = useReducer(warehousesPageReducer, {
        address: "",
        code: "",
        country: "Uganda",
        district: "",
        isActive: true,
        isSubmitting: false,
        isUpdatingId: null,
        listSearchQuery: "",
        listStatusFilter: "all",
        name: "",
        postalCode: "",
    });

    const warehouseSummary = useMemo(() => {
        const total = warehouses.length;
        const active = warehouses.filter(
            (warehouse) => warehouse.isActive
        ).length;
        const inactive = total - active;
        const totalLocations = warehouses.reduce(
            (sum, warehouse) => sum + warehouse._count.locations,
            0
        );

        return { active, inactive, total, totalLocations };
    }, [warehouses]);

    const resetForm = () => {
        setState({
            address: "",
            code: "",
            country: "Uganda",
            district: "",
            isActive: true,
            name: "",
            postalCode: "",
        });
    };

    const handleCreateWarehouse = async () => {
        const trimmedAddress = state.address.trim();
        const addressValue = trimmedAddress.length > 0 ? state.address : null;
        const trimmedCountry = state.country.trim();
        const countryValue =
            trimmedCountry.length > 0 ? state.country : "Uganda";
        const trimmedDistrict = state.district.trim();
        const districtValue =
            trimmedDistrict.length > 0 ? state.district : null;
        const trimmedPostalCode = state.postalCode.trim();
        const postalCodeValue =
            trimmedPostalCode.length > 0 ? state.postalCode : null;

        try {
            setState({ isSubmitting: true });
            await createWarehouse({
                data: {
                    address: addressValue,
                    code: state.code.trim(),
                    country: countryValue,
                    district: districtValue,
                    isActive: state.isActive,
                    name: state.name.trim(),
                    postalCode: postalCodeValue,
                },
            });
            toast.success("Warehouse created.");
            resetForm();
            await router.invalidate();
            setState({ isSubmitting: false });
        } catch (error) {
            setState({ isSubmitting: false });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create warehouse."
            );
        }
    };

    const runWarehouseAction = async (
        warehouseId: string,
        work: () => Promise<unknown>,
        successMessage: string,
        errorMessage: string
    ): Promise<void> => {
        try {
            setState({
                isUpdatingId: warehouseId,
            });
            await work();
            toast.success(successMessage);
            await router.invalidate();
            setState({
                isUpdatingId: null,
            });
        } catch (error) {
            setState({
                isUpdatingId: null,
            });
            toast.error(error instanceof Error ? error.message : errorMessage);
        }
    };

    const handleToggleWarehouseActive = async (
        warehouseId: string,
        isActive: boolean
    ): Promise<void> => {
        await runWarehouseAction(
            warehouseId,
            () =>
                updateWarehouse({
                    data: {
                        id: warehouseId,
                        isActive: !isActive,
                    },
                }),
            "Warehouse updated.",
            "Failed to update warehouse."
        );
    };

    const handleArchiveWarehouse = async (
        warehouseId: string
    ): Promise<void> => {
        await runWarehouseAction(
            warehouseId,
            () =>
                archiveWarehouse({
                    data: {
                        id: warehouseId,
                    },
                }),
            "Warehouse archived.",
            "Failed to archive warehouse."
        );
    };

    return (
        <section className="w-full space-y-5">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl">Warehouses</h1>
                <p className="text-muted-foreground text-sm">
                    Manage warehouse master data and activation status.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Total Warehouses
                        </p>
                        <p className="font-semibold text-2xl">
                            {warehouseSummary.total}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Active
                        </p>
                        <p className="font-semibold text-2xl text-emerald-600 dark:text-emerald-400">
                            {warehouseSummary.active}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Inactive
                        </p>
                        <p className="font-semibold text-2xl text-amber-600 dark:text-amber-400">
                            {warehouseSummary.inactive}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Total Locations Linked
                        </p>
                        <p className="font-semibold text-2xl">
                            {warehouseSummary.totalLocations}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <CreateWarehouseCard
                onCreateWarehouse={() => {
                    handleCreateWarehouse().catch(() => undefined);
                }}
                onPatchState={setState}
                state={state}
            />

            <WarehouseListCard
                isUpdatingId={state.isUpdatingId}
                onArchiveWarehouse={(warehouseId) => {
                    handleArchiveWarehouse(warehouseId).catch(() => undefined);
                }}
                onSearchChange={(listSearchQuery) => {
                    setState({ listSearchQuery });
                }}
                onStatusFilterChange={(listStatusFilter) => {
                    setState({ listStatusFilter });
                }}
                onToggleWarehouseActive={(warehouseId, isActive) => {
                    handleToggleWarehouseActive(warehouseId, isActive).catch(
                        () => undefined
                    );
                }}
                searchQuery={state.listSearchQuery}
                statusFilter={state.listStatusFilter}
                warehouses={warehouses}
            />
        </section>
    );
}
