import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
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

interface WarehousesPageState {
    address: string;
    code: string;
    country: string;
    district: string;
    isActive: boolean;
    isSubmitting: boolean;
    isUpdatingId: string | null;
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
        <Card>
            <CardHeader>
                <CardTitle>Create Warehouse</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Button
                    disabled={
                        state.isSubmitting ||
                        state.code.trim().length === 0 ||
                        state.name.trim().length === 0
                    }
                    onClick={onCreateWarehouse}
                >
                    {state.isSubmitting ? "Creating..." : "Create Warehouse"}
                </Button>
            </CardContent>
        </Card>
    );
};

interface WarehouseListCardProps {
    isUpdatingId: string | null;
    onArchiveWarehouse: (warehouseId: string) => void;
    onToggleWarehouseActive: (warehouseId: string, isActive: boolean) => void;
    warehouses: WarehousesList;
}

const WarehouseListCard = ({
    isUpdatingId,
    onArchiveWarehouse,
    onToggleWarehouseActive,
    warehouses,
}: WarehouseListCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Warehouse List</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
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
                        {warehouses.map((warehouse) => (
                            <TableRow key={warehouse.id}>
                                <TableCell>{warehouse.code}</TableCell>
                                <TableCell>{warehouse.name}</TableCell>
                                <TableCell>
                                    {warehouse.district ?? "—"}
                                </TableCell>
                                <TableCell>{warehouse.country}</TableCell>
                                <TableCell>
                                    {warehouse._count.locations}
                                </TableCell>
                                <TableCell>
                                    {warehouse.isActive ? "Active" : "Inactive"}
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex justify-end gap-2">
                                        <Button
                                            disabled={
                                                isUpdatingId === warehouse.id
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
                                                isUpdatingId === warehouse.id
                                            }
                                            onClick={() =>
                                                onArchiveWarehouse(warehouse.id)
                                            }
                                            size="sm"
                                            variant="destructive"
                                        >
                                            Archive
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
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
        name: "",
        postalCode: "",
    });

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
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Warehouses</h1>
                <p className="text-muted-foreground text-sm">
                    Manage warehouse master data and activation status.
                </p>
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
                onToggleWarehouseActive={(warehouseId, isActive) => {
                    handleToggleWarehouseActive(warehouseId, isActive).catch(
                        () => undefined
                    );
                }}
                warehouses={warehouses}
            />
        </section>
    );
}
