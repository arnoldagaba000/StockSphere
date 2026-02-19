import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
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

export const Route = createFileRoute("/_dashboard/locations")({
    component: LocationsPage,
    loader: () => getWarehouses({ data: {} }),
});

function LocationsPage() {
    const warehouses = Route.useLoaderData();
    const initialWarehouseId = warehouses[0]?.id ?? "";
    const [warehouseId, setWarehouseId] = useState(initialWarehouseId);
    const [locations, setLocations] = useState<
        Awaited<ReturnType<typeof getLocations>>
    >([]);
    const [isLoadingLocations, setIsLoadingLocations] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [type, setType] = useState<LocationType>("STANDARD");
    const [isActive, setIsActive] = useState(true);

    const loadLocations = useCallback(async (nextWarehouseId: string) => {
        if (!nextWarehouseId) {
            return;
        }

        try {
            await Promise.resolve();
            setIsLoadingLocations(true);
            const result = await getLocations({
                data: { warehouseId: nextWarehouseId },
            });
            setLocations(result);
            setIsLoadingLocations(false);
        } catch (error) {
            setIsLoadingLocations(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load locations."
            );
        }
    }, []);

    useEffect(() => {
        if (!warehouseId) {
            return;
        }

        loadLocations(warehouseId).catch(() => undefined);
    }, [warehouseId, loadLocations]);

    const resetForm = () => {
        setCode("");
        setName("");
        setType("STANDARD");
        setIsActive(true);
    };

    const handleCreateLocation = async () => {
        try {
            setIsSubmitting(true);
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
            setIsSubmitting(false);
        } catch (error) {
            setIsSubmitting(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create location."
            );
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Locations</h1>
                <p className="text-muted-foreground text-sm">
                    Manage storage locations within each warehouse.
                </p>
            </div>

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
                                    setWarehouseId(value ?? "")
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
                                            {warehouse.code} - {warehouse.name}
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
                                    setCode(event.target.value.toUpperCase())
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
                                    setName(event.target.value)
                                }
                                placeholder="Aisle A, Bin 02"
                                value={name}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Type</Label>
                            <Select
                                onValueChange={(value) =>
                                    setType(
                                        (value as LocationType) ?? "STANDARD"
                                    )
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
                                onCheckedChange={setIsActive}
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
                        onClick={handleCreateLocation}
                    >
                        {isSubmitting ? "Creating..." : "Create Location"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Location List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
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
                                        colSpan={5}
                                    >
                                        Loading locations...
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {!isLoadingLocations && locations.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={5}
                                    >
                                        No locations found for this warehouse.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {!isLoadingLocations && locations.length > 0
                                ? locations.map((location) => (
                                      <TableRow key={location.id}>
                                          <TableCell>{location.code}</TableCell>
                                          <TableCell>{location.name}</TableCell>
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
                                                      onClick={async () => {
                                                          try {
                                                              setIsUpdatingId(
                                                                  location.id
                                                              );
                                                              await updateLocation(
                                                                  {
                                                                      data: {
                                                                          id: location.id,
                                                                          isActive:
                                                                              !location.isActive,
                                                                      },
                                                                  }
                                                              );
                                                              toast.success(
                                                                  "Location updated."
                                                              );
                                                              await loadLocations(
                                                                  warehouseId
                                                              );
                                                              setIsUpdatingId(
                                                                  null
                                                              );
                                                          } catch (error) {
                                                              setIsUpdatingId(
                                                                  null
                                                              );
                                                              toast.error(
                                                                  error instanceof
                                                                      Error
                                                                      ? error.message
                                                                      : "Failed to update location."
                                                              );
                                                          }
                                                      }}
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
                                                      onClick={async () => {
                                                          const nextType =
                                                              location.type ===
                                                              "QUARANTINE"
                                                                  ? "STANDARD"
                                                                  : "QUARANTINE";

                                                          try {
                                                              setIsUpdatingId(
                                                                  location.id
                                                              );
                                                              await updateLocation(
                                                                  {
                                                                      data: {
                                                                          id: location.id,
                                                                          type: nextType,
                                                                      },
                                                                  }
                                                              );
                                                              toast.success(
                                                                  "Location type updated."
                                                              );
                                                              await loadLocations(
                                                                  warehouseId
                                                              );
                                                              setIsUpdatingId(
                                                                  null
                                                              );
                                                          } catch (error) {
                                                              setIsUpdatingId(
                                                                  null
                                                              );
                                                              toast.error(
                                                                  error instanceof
                                                                      Error
                                                                      ? error.message
                                                                      : "Failed to update location type."
                                                              );
                                                          }
                                                      }}
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
                                                      onClick={async () => {
                                                          try {
                                                              setIsUpdatingId(
                                                                  location.id
                                                              );
                                                              await archiveLocation(
                                                                  {
                                                                      data: {
                                                                          id: location.id,
                                                                      },
                                                                  }
                                                              );
                                                              toast.success(
                                                                  "Location archived."
                                                              );
                                                              await loadLocations(
                                                                  warehouseId
                                                              );
                                                              setIsUpdatingId(
                                                                  null
                                                              );
                                                          } catch (error) {
                                                              setIsUpdatingId(
                                                                  null
                                                              );
                                                              toast.error(
                                                                  error instanceof
                                                                      Error
                                                                      ? error.message
                                                                      : "Failed to archive location."
                                                              );
                                                          }
                                                      }}
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
                </CardContent>
            </Card>
        </section>
    );
}
