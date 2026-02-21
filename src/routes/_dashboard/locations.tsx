import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useReducer } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Pagination,
    PaginationContent,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from "@/components/ui/pagination";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getWarehouses } from "@/features/inventory/get-warehouses";
import { createLocation } from "@/features/location/create-location";
import { getLocations } from "@/features/location/get-locations";
import {
    archiveLocation,
    updateLocation,
} from "@/features/location/update-location";
import type { LocationType } from "@/generated/prisma/client";

const LOCATION_TYPES: LocationType[] = [
    "STANDARD",
    "QUARANTINE",
    "DAMAGED",
    "RETURNS",
    "STAGING",
];

const SHORT_ID_LENGTH = 8;

const formatEntityLabel = (name: string, id: string): string =>
    `${name} · ${id.slice(0, SHORT_ID_LENGTH)}`;

interface LocationsPageState {
    code: string;
    isActive: boolean;
    isLoadingLocations: boolean;
    isSubmitting: boolean;
    isUpdatingId: string | null;
    locations: Awaited<ReturnType<typeof getLocations>>;
    locationsPage: number;
    locationsPageSize: number;
    name: string;
    type: LocationType;
    viewWarehouseId: string;
    warehouseId: string;
}

const locationsPageReducer = (
    state: LocationsPageState,
    patch: Partial<LocationsPageState>
): LocationsPageState => ({
    ...state,
    ...patch,
});

type WarehousesData = Awaited<ReturnType<typeof getWarehouses>>;

interface CreateLocationCardProps {
    code: string;
    isActive: boolean;
    isSubmitting: boolean;
    name: string;
    onCreate: () => void;
    onPatchState: (patch: Partial<LocationsPageState>) => void;
    type: LocationType;
    warehouseId: string;
    warehouses: WarehousesData;
}

const CreateLocationCard = ({
    code,
    isActive,
    isSubmitting,
    name,
    onCreate,
    onPatchState,
    type,
    warehouseId,
    warehouses,
}: CreateLocationCardProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Create Location</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2 md:col-span-2">
                        <Label>Warehouse</Label>
                        <Select
                            onValueChange={(value) =>
                                onPatchState({
                                    warehouseId: value ?? "",
                                })
                            }
                            value={warehouseId}
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
                                        {formatEntityLabel(
                                            warehouse.name,
                                            warehouse.id
                                        )}{" "}
                                        ({warehouse.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location-code">Code</Label>
                        <Input
                            id="location-code"
                            onChange={(event) =>
                                onPatchState({
                                    code: event.target.value.toUpperCase(),
                                })
                            }
                            placeholder="A-01-BIN-02"
                            value={code}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="location-name">Name</Label>
                        <Input
                            id="location-name"
                            onChange={(event) =>
                                onPatchState({
                                    name: event.target.value,
                                })
                            }
                            placeholder="Aisle A, Bin 02"
                            value={name}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Type</Label>
                        <Select
                            onValueChange={(value) =>
                                onPatchState({
                                    type: (value as LocationType) ?? "STANDARD",
                                })
                            }
                            value={type}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {LOCATION_TYPES.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-end gap-2 pb-2">
                        <Switch
                            checked={isActive}
                            id="location-active"
                            onCheckedChange={(checked) =>
                                onPatchState({
                                    isActive: checked,
                                })
                            }
                        />
                        <Label htmlFor="location-active">Active</Label>
                    </div>
                </div>
                <Button
                    disabled={
                        isSubmitting ||
                        !warehouseId ||
                        code.trim().length === 0 ||
                        name.trim().length === 0
                    }
                    onClick={onCreate}
                >
                    {isSubmitting ? "Creating..." : "Create Location"}
                </Button>
            </CardContent>
        </Card>
    );
};

interface LocationListCardProps {
    isLoadingLocations: boolean;
    isUpdatingId: string | null;
    locations: Awaited<ReturnType<typeof getLocations>>;
    locationsPage: number;
    locationsPageSize: number;
    onArchive: (locationId: string) => void;
    onChangePage: (page: number) => void;
    onChangeViewWarehouse: (warehouseId: string) => void;
    onToggleActive: (locationId: string, isActive: boolean) => void;
    onToggleType: (locationId: string, type: LocationType) => void;
    viewWarehouseId: string;
    warehouses: WarehousesData;
}

const LocationListCard = ({
    isLoadingLocations,
    isUpdatingId,
    locations,
    locationsPage,
    locationsPageSize,
    onArchive,
    onChangePage,
    onChangeViewWarehouse,
    onToggleActive,
    onToggleType,
    viewWarehouseId,
    warehouses,
}: LocationListCardProps) => {
    const totalPages = Math.max(
        1,
        Math.ceil(locations.length / locationsPageSize)
    );
    const startIndex = (locationsPage - 1) * locationsPageSize;
    const paginatedLocations = locations.slice(
        startIndex,
        startIndex + locationsPageSize
    );

    return (
        <Card>
            <CardHeader>
                <CardTitle>Location List</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2 md:max-w-sm">
                    <Label>View Warehouse</Label>
                    <Select
                        onValueChange={(value) =>
                            onChangeViewWarehouse(
                                value && value !== "all" ? value : ""
                            )
                        }
                        value={viewWarehouseId || "all"}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All warehouses</SelectItem>
                            {warehouses.map((warehouse) => (
                                <SelectItem
                                    key={warehouse.id}
                                    value={warehouse.id}
                                >
                                    {formatEntityLabel(
                                        warehouse.name,
                                        warehouse.id
                                    )}{" "}
                                    ({warehouse.code})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Warehouse</TableHead>
                            <TableHead>Code</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoadingLocations ? (
                            <TableRow>
                                <TableCell
                                    className="text-muted-foreground"
                                    colSpan={6}
                                >
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-48" />
                                        <Skeleton className="h-4 w-32" />
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {!isLoadingLocations && locations.length === 0 ? (
                            <TableRow>
                                <TableCell
                                    className="text-muted-foreground"
                                    colSpan={6}
                                >
                                    No locations found for this view.
                                </TableCell>
                            </TableRow>
                        ) : null}
                        {!isLoadingLocations && paginatedLocations.length > 0
                            ? paginatedLocations.map((location) => (
                                  <TableRow key={location.id}>
                                      <TableCell>
                                          <div className="flex flex-col gap-0.5">
                                              <span>
                                                  {location.warehouse.name}
                                              </span>
                                              <span className="font-mono text-muted-foreground text-xs">
                                                  {location.warehouse.id.slice(
                                                      0,
                                                      SHORT_ID_LENGTH
                                                  )}{" "}
                                                  ({location.warehouse.code})
                                              </span>
                                          </div>
                                      </TableCell>
                                      <TableCell>{location.code}</TableCell>
                                      <TableCell>
                                          <div className="flex flex-col gap-0.5">
                                              <span>{location.name}</span>
                                              <span className="font-mono text-muted-foreground text-xs">
                                                  {location.id.slice(
                                                      0,
                                                      SHORT_ID_LENGTH
                                                  )}
                                              </span>
                                          </div>
                                      </TableCell>
                                      <TableCell>{location.type}</TableCell>
                                      <TableCell>
                                          {location.isActive
                                              ? "Active"
                                              : "Inactive"}
                                      </TableCell>
                                      <TableCell className="text-right">
                                          <div className="flex justify-end gap-2">
                                              <Button
                                                  disabled={
                                                      isUpdatingId ===
                                                      location.id
                                                  }
                                                  onClick={() =>
                                                      onToggleActive(
                                                          location.id,
                                                          location.isActive
                                                      )
                                                  }
                                                  size="sm"
                                                  variant="outline"
                                              >
                                                  {location.isActive
                                                      ? "Deactivate"
                                                      : "Activate"}
                                              </Button>
                                              <Button
                                                  disabled={
                                                      isUpdatingId ===
                                                      location.id
                                                  }
                                                  onClick={() =>
                                                      onToggleType(
                                                          location.id,
                                                          location.type
                                                      )
                                                  }
                                                  size="sm"
                                                  variant="outline"
                                              >
                                                  Toggle Type
                                              </Button>
                                              <Button
                                                  disabled={
                                                      isUpdatingId ===
                                                      location.id
                                                  }
                                                  onClick={() =>
                                                      onArchive(location.id)
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
                            : null}
                    </TableBody>
                </Table>
                {locations.length > locationsPageSize ? (
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    className={
                                        locationsPage <= 1
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (locationsPage > 1) {
                                            onChangePage(locationsPage - 1);
                                        }
                                    }}
                                />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#" isActive>
                                    Page {locationsPage} of {totalPages}
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext
                                    className={
                                        locationsPage >= totalPages
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (locationsPage < totalPages) {
                                            onChangePage(locationsPage + 1);
                                        }
                                    }}
                                />
                            </PaginationItem>
                        </PaginationContent>
                    </Pagination>
                ) : null}
            </CardContent>
        </Card>
    );
};

export const Route = createFileRoute("/_dashboard/locations")({
    component: LocationsPage,
    loader: () => getWarehouses({ data: {} }),
});

function LocationsPage() {
    const warehouses = Route.useLoaderData();
    const initialWarehouseId = warehouses[0]?.id ?? "";
    const [state, patchState] = useReducer(locationsPageReducer, {
        code: "",
        isActive: true,
        isLoadingLocations: false,
        isSubmitting: false,
        isUpdatingId: null,
        locations: [],
        locationsPage: 1,
        locationsPageSize: 10,
        name: "",
        type: "STANDARD",
        viewWarehouseId: "",
        warehouseId: initialWarehouseId,
    });
    const {
        code,
        isActive,
        isLoadingLocations,
        isSubmitting,
        isUpdatingId,
        locations,
        locationsPage,
        locationsPageSize,
        name,
        type,
        viewWarehouseId,
        warehouseId,
    } = state;

    const loadLocations = useCallback(async (nextWarehouseId?: string) => {
        try {
            await Promise.resolve();
            patchState({ isLoadingLocations: true });
            const result = await getLocations({
                data: {
                    includeInactive: true,
                    warehouseId: nextWarehouseId || undefined,
                },
            });
            patchState({
                isLoadingLocations: false,
                locations: result,
                locationsPage: 1,
            });
        } catch (error) {
            patchState({ isLoadingLocations: false });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load locations."
            );
        }
    }, []);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            loadLocations(viewWarehouseId).catch(() => undefined);
        }, 0);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [viewWarehouseId, loadLocations]);

    const resetForm = () => {
        patchState({
            code: "",
            isActive: true,
            name: "",
            type: "STANDARD",
        });
    };

    const handleCreateLocation = async () => {
        try {
            patchState({ isSubmitting: true });
            await createLocation({
                data: {
                    code: code.trim().toUpperCase(),
                    isActive,
                    name: name.trim(),
                    type,
                    warehouseId,
                },
            });
            toast.success("Location created.");
            resetForm();
            await loadLocations(warehouseId);
            patchState({ isSubmitting: false });
        } catch (error) {
            patchState({ isSubmitting: false });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create location."
            );
        }
    };

    const runLocationAction = async (
        locationId: string,
        work: () => Promise<unknown>,
        successMessage: string,
        errorMessage: string
    ): Promise<void> => {
        try {
            patchState({ isUpdatingId: locationId });
            await work();
            toast.success(successMessage);
            await loadLocations(warehouseId);
            patchState({ isUpdatingId: null });
        } catch (error) {
            patchState({ isUpdatingId: null });
            toast.error(error instanceof Error ? error.message : errorMessage);
        }
    };

    const handleToggleActive = async (
        locationId: string,
        isActiveValue: boolean
    ): Promise<void> => {
        await runLocationAction(
            locationId,
            () =>
                updateLocation({
                    data: {
                        id: locationId,
                        isActive: !isActiveValue,
                    },
                }),
            "Location updated.",
            "Failed to update location."
        );
    };

    const handleToggleType = async (
        locationId: string,
        currentType: LocationType
    ): Promise<void> => {
        const nextType =
            currentType === "QUARANTINE" ? "STANDARD" : "QUARANTINE";
        await runLocationAction(
            locationId,
            () =>
                updateLocation({
                    data: {
                        id: locationId,
                        type: nextType,
                    },
                }),
            "Location type updated.",
            "Failed to update location type."
        );
    };

    const handleArchive = async (locationId: string): Promise<void> => {
        await runLocationAction(
            locationId,
            () =>
                archiveLocation({
                    data: { id: locationId },
                }),
            "Location archived.",
            "Failed to archive location."
        );
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Locations</h1>
                <p className="text-muted-foreground text-sm">
                    Manage storage locations within each warehouse.
                </p>
            </div>

            <CreateLocationCard
                code={code}
                isActive={isActive}
                isSubmitting={isSubmitting}
                name={name}
                onCreate={() => {
                    handleCreateLocation().catch(() => undefined);
                }}
                onPatchState={patchState}
                type={type}
                warehouseId={warehouseId}
                warehouses={warehouses}
            />

            <LocationListCard
                isLoadingLocations={isLoadingLocations}
                isUpdatingId={isUpdatingId}
                locations={locations}
                locationsPage={locationsPage}
                locationsPageSize={locationsPageSize}
                onArchive={(locationId) => {
                    handleArchive(locationId).catch(() => undefined);
                }}
                onChangePage={(page) => {
                    patchState({ locationsPage: page });
                }}
                onChangeViewWarehouse={(nextWarehouseId) => {
                    patchState({ viewWarehouseId: nextWarehouseId });
                }}
                onToggleActive={(locationId, isActiveValue) => {
                    handleToggleActive(locationId, isActiveValue).catch(
                        () => undefined
                    );
                }}
                onToggleType={(locationId, currentType) => {
                    handleToggleType(locationId, currentType).catch(
                        () => undefined
                    );
                }}
                viewWarehouseId={viewWarehouseId}
                warehouses={warehouses}
            />
        </section>
    );
}
