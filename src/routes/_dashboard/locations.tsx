import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
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
const SELECT_TRIGGER_CLASS =
    "h-10 w-full rounded-xl border-border/70 bg-muted/35 px-3 text-sm shadow-sm transition-colors hover:bg-muted/55";
const SELECT_CONTENT_CLASS =
    "rounded-xl border-border/70 bg-popover/98 shadow-xl";

const formatEntityLabel = (name: string, id: string): string =>
    `${name} · ${id.slice(0, SHORT_ID_LENGTH)}`;

const formatShortId = (value: string | undefined): string =>
    value ? value.slice(0, SHORT_ID_LENGTH) : "n/a";

type LocationStatusFilter = "active" | "all" | "inactive";
type LocationTypeFilter = "all" | LocationType;

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
    searchQuery: string;
    statusFilter: LocationStatusFilter;
    type: LocationType;
    typeFilter: LocationTypeFilter;
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
        <Card className="border-border/70">
            <CardHeader className="space-y-1">
                <CardTitle>Create Location</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Add a new storage position and assign it to a warehouse.
                </p>
            </CardHeader>
            <CardContent className="space-y-5">
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
                            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                                <SelectValue placeholder="Select warehouse" />
                            </SelectTrigger>
                            <SelectContent className={SELECT_CONTENT_CLASS}>
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
                        <p className="text-muted-foreground text-xs">
                            Use a unique code format for easier scanning and
                            lookup.
                        </p>
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
                            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={SELECT_CONTENT_CLASS}>
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
                <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-3">
                    <p className="text-muted-foreground text-xs">
                        New location IDs are generated automatically after
                        creation.
                    </p>
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
                </div>
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
    onChangeSearchQuery: (searchQuery: string) => void;
    onChangeStatusFilter: (statusFilter: LocationStatusFilter) => void;
    onChangeTypeFilter: (typeFilter: LocationTypeFilter) => void;
    onChangeViewWarehouse: (warehouseId: string) => void;
    onToggleActive: (locationId: string, isActive: boolean) => void;
    onToggleType: (locationId: string, type: LocationType) => void;
    searchQuery: string;
    statusFilter: LocationStatusFilter;
    typeFilter: LocationTypeFilter;
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
    onChangeSearchQuery,
    onChangeStatusFilter,
    onChangeTypeFilter,
    onChangeViewWarehouse,
    onToggleActive,
    onToggleType,
    searchQuery,
    statusFilter,
    typeFilter,
    viewWarehouseId,
    warehouses,
}: LocationListCardProps) => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();
    const filteredLocations = useMemo(() => {
        return locations.filter((location) => {
            const typeMatches =
                typeFilter === "all" ? true : location.type === typeFilter;
            let statusMatches = true;
            if (statusFilter === "active") {
                statusMatches = location.isActive;
            } else if (statusFilter === "inactive") {
                statusMatches = !location.isActive;
            }
            const searchMatches =
                normalizedSearchQuery.length === 0
                    ? true
                    : [
                          location.code,
                          location.name,
                          location.type,
                          location.warehouse.code,
                          location.warehouse.name,
                          location.id,
                      ].some((field) =>
                          field.toLowerCase().includes(normalizedSearchQuery)
                      );

            return typeMatches && statusMatches && searchMatches;
        });
    }, [locations, normalizedSearchQuery, statusFilter, typeFilter]);

    const totalPages = Math.max(
        1,
        Math.ceil(filteredLocations.length / locationsPageSize)
    );
    const safePage = Math.min(locationsPage, totalPages);
    const startIndex = (safePage - 1) * locationsPageSize;
    const paginatedLocations = filteredLocations.slice(
        startIndex,
        startIndex + locationsPageSize
    );
    const activeCount = filteredLocations.filter(
        (location) => location.isActive
    ).length;
    const quarantineCount = filteredLocations.filter(
        (location) => location.type === "QUARANTINE"
    ).length;

    return (
        <Card className="border-border/70">
            <CardHeader className="space-y-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                        <CardTitle>Manage Locations</CardTitle>
                        <p className="text-muted-foreground text-sm">
                            Filter by warehouse, status, and type to find
                            locations quickly.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Badge variant="secondary">
                            Visible: {filteredLocations.length}
                        </Badge>
                        <Badge variant="outline">Active: {activeCount}</Badge>
                        <Badge variant="outline">
                            Quarantine: {quarantineCount}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="space-y-5">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                        <Label htmlFor="location-search">Search</Label>
                        <Input
                            id="location-search"
                            onChange={(event) => {
                                onChangeSearchQuery(event.target.value);
                            }}
                            placeholder="Code, name, type, warehouse..."
                            value={searchQuery}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Type Filter</Label>
                        <Select
                            onValueChange={(value) => {
                                onChangeTypeFilter(
                                    (value as LocationTypeFilter) ?? "all"
                                );
                            }}
                            value={typeFilter}
                        >
                            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={SELECT_CONTENT_CLASS}>
                                <SelectItem value="all">All types</SelectItem>
                                {LOCATION_TYPES.map((option) => (
                                    <SelectItem key={option} value={option}>
                                        {option}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Status Filter</Label>
                        <Select
                            onValueChange={(value) => {
                                onChangeStatusFilter(
                                    (value as LocationStatusFilter) ?? "all"
                                );
                            }}
                            value={statusFilter}
                        >
                            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={SELECT_CONTENT_CLASS}>
                                <SelectItem value="all">
                                    All statuses
                                </SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>View Warehouse</Label>
                        <Select
                            onValueChange={(value) =>
                                onChangeViewWarehouse(
                                    value && value !== "all" ? value : ""
                                )
                            }
                            value={viewWarehouseId || "all"}
                        >
                            <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className={SELECT_CONTENT_CLASS}>
                                <SelectItem value="all">
                                    All warehouses
                                </SelectItem>
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
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[940px]">
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
                                        <div className="space-y-2 py-2">
                                            <Skeleton className="h-4 w-56" />
                                            <Skeleton className="h-4 w-40" />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {!isLoadingLocations &&
                            filteredLocations.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={6}
                                    >
                                        No locations match your current filters.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {!isLoadingLocations &&
                            paginatedLocations.length > 0
                                ? paginatedLocations.map((location) => (
                                      <TableRow key={location.id}>
                                          <TableCell>
                                              <div className="flex flex-col gap-0.5">
                                                  <span>
                                                      {location.warehouse.name}
                                                  </span>
                                                  <span className="font-mono text-muted-foreground text-xs">
                                                      {formatShortId(
                                                          location.warehouse.id
                                                      )}{" "}
                                                      ({location.warehouse.code}
                                                      )
                                                  </span>
                                              </div>
                                          </TableCell>
                                          <TableCell className="font-medium">
                                              {location.code}
                                          </TableCell>
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
                                          <TableCell>
                                              <Badge variant="outline">
                                                  {location.type}
                                              </Badge>
                                          </TableCell>
                                          <TableCell>
                                              <Badge
                                                  variant={
                                                      location.isActive
                                                          ? "secondary"
                                                          : "ghost"
                                                  }
                                              >
                                                  {location.isActive
                                                      ? "Active"
                                                      : "Inactive"}
                                              </Badge>
                                          </TableCell>
                                          <TableCell className="text-right">
                                              <div className="flex flex-wrap justify-end gap-2">
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
                </div>
                {filteredLocations.length > locationsPageSize ? (
                    <Pagination>
                        <PaginationContent>
                            <PaginationItem>
                                <PaginationPrevious
                                    className={
                                        safePage <= 1
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (safePage > 1) {
                                            onChangePage(safePage - 1);
                                        }
                                    }}
                                />
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationLink href="#" isActive>
                                    Page {safePage} of {totalPages}
                                </PaginationLink>
                            </PaginationItem>
                            <PaginationItem>
                                <PaginationNext
                                    className={
                                        safePage >= totalPages
                                            ? "pointer-events-none opacity-50"
                                            : ""
                                    }
                                    href="#"
                                    onClick={(event) => {
                                        event.preventDefault();
                                        if (safePage < totalPages) {
                                            onChangePage(safePage + 1);
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
        searchQuery: "",
        statusFilter: "all",
        typeFilter: "all",
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
        searchQuery,
        statusFilter,
        typeFilter,
        type,
        viewWarehouseId,
        warehouseId,
    } = state;

    const locationsSummary = useMemo(() => {
        const total = locations.length;
        const active = locations.filter((location) => location.isActive).length;
        const inactive = total - active;
        const quarantined = locations.filter(
            (location) => location.type === "QUARANTINE"
        ).length;
        const uniqueWarehouses = new Set(
            locations.map((location) => location.warehouse.code)
        ).size;

        return { active, inactive, quarantined, total, uniqueWarehouses };
    }, [locations]);

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
        <section className="w-full space-y-5">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl">Locations</h1>
                <p className="text-muted-foreground text-sm">
                    Manage storage locations within each warehouse.
                </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Total Locations
                        </p>
                        <p className="font-semibold text-2xl">
                            {locationsSummary.total}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Active
                        </p>
                        <p className="font-semibold text-2xl text-emerald-600 dark:text-emerald-400">
                            {locationsSummary.active}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Quarantine
                        </p>
                        <p className="font-semibold text-2xl text-amber-600 dark:text-amber-400">
                            {locationsSummary.quarantined}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Warehouses Covered
                        </p>
                        <p className="font-semibold text-2xl">
                            {locationsSummary.uniqueWarehouses}
                        </p>
                        <p className="text-muted-foreground text-xs">
                            Inactive: {locationsSummary.inactive}
                        </p>
                    </CardContent>
                </Card>
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
                onChangeSearchQuery={(nextSearchQuery) => {
                    patchState({
                        locationsPage: 1,
                        searchQuery: nextSearchQuery,
                    });
                }}
                onChangeStatusFilter={(nextStatusFilter) => {
                    patchState({
                        locationsPage: 1,
                        statusFilter: nextStatusFilter,
                    });
                }}
                onChangeTypeFilter={(nextTypeFilter) => {
                    patchState({
                        locationsPage: 1,
                        typeFilter: nextTypeFilter,
                    });
                }}
                onChangeViewWarehouse={(nextWarehouseId) => {
                    patchState({
                        locationsPage: 1,
                        viewWarehouseId: nextWarehouseId,
                    });
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
                searchQuery={searchQuery}
                statusFilter={statusFilter}
                typeFilter={typeFilter}
                viewWarehouseId={viewWarehouseId}
                warehouses={warehouses}
            />
        </section>
    );
}
