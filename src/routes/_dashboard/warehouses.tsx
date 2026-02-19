import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
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

function WarehousesPage() {
    const router = useRouter();
    const warehouses = Route.useLoaderData();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isUpdatingId, setIsUpdatingId] = useState<string | null>(null);
    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [address, setAddress] = useState("");
    const [district, setDistrict] = useState("");
    const [postalCode, setPostalCode] = useState("");
    const [country, setCountry] = useState("Uganda");
    const [isActive, setIsActive] = useState(true);

    const resetForm = () => {
        setCode("");
        setName("");
        setAddress("");
        setDistrict("");
        setPostalCode("");
        setCountry("Uganda");
        setIsActive(true);
    };

    const handleCreateWarehouse = async () => {
        try {
            setIsSubmitting(true);
            await createWarehouse({
                data: {
                    address: address.trim().length > 0 ? address : null,
                    code: code.trim(),
                    country: country.trim().length > 0 ? country : "Uganda",
                    district: district.trim().length > 0 ? district : null,
                    isActive,
                    name: name.trim(),
                    postalCode:
                        postalCode.trim().length > 0 ? postalCode : null,
                },
            });
            toast.success("Warehouse created.");
            resetForm();
            await router.invalidate();
            setIsSubmitting(false);
        } catch (error) {
            setIsSubmitting(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create warehouse."
            );
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Warehouses</h1>
                <p className="text-muted-foreground text-sm">
                    Manage warehouse master data and activation status.
                </p>
            </div>

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
                                    setCode(event.target.value.toUpperCase())
                                }
                                placeholder="WH-KLA-01"
                                value={code}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="warehouse-name">Name</Label>
                            <Input
                                id="warehouse-name"
                                onChange={(event) =>
                                    setName(event.target.value)
                                }
                                placeholder="Kampala Main Warehouse"
                                value={name}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="warehouse-address">Address</Label>
                            <Input
                                id="warehouse-address"
                                onChange={(event) =>
                                    setAddress(event.target.value)
                                }
                                placeholder="Physical address"
                                value={address}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="warehouse-district">District</Label>
                            <Input
                                id="warehouse-district"
                                onChange={(event) =>
                                    setDistrict(event.target.value)
                                }
                                value={district}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="warehouse-postal">
                                Postal Code
                            </Label>
                            <Input
                                id="warehouse-postal"
                                onChange={(event) =>
                                    setPostalCode(event.target.value)
                                }
                                value={postalCode}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="warehouse-country">Country</Label>
                            <Input
                                id="warehouse-country"
                                onChange={(event) =>
                                    setCountry(event.target.value)
                                }
                                value={country}
                            />
                        </div>
                        <div className="flex items-end gap-2 pb-2">
                            <Switch
                                checked={isActive}
                                id="warehouse-active"
                                onCheckedChange={setIsActive}
                            />
                            <Label htmlFor="warehouse-active">Active</Label>
                        </div>
                    </div>
                    <Button
                        disabled={
                            isSubmitting ||
                            code.trim().length === 0 ||
                            name.trim().length === 0
                        }
                        onClick={handleCreateWarehouse}
                    >
                        {isSubmitting ? "Creating..." : "Create Warehouse"}
                    </Button>
                </CardContent>
            </Card>

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
                                        {warehouse.isActive
                                            ? "Active"
                                            : "Inactive"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                disabled={
                                                    isUpdatingId ===
                                                    warehouse.id
                                                }
                                                onClick={async () => {
                                                    try {
                                                        setIsUpdatingId(
                                                            warehouse.id
                                                        );
                                                        await updateWarehouse({
                                                            data: {
                                                                id: warehouse.id,
                                                                isActive:
                                                                    !warehouse.isActive,
                                                            },
                                                        });
                                                        toast.success(
                                                            "Warehouse updated."
                                                        );
                                                        await router.invalidate();
                                                        setIsUpdatingId(null);
                                                    } catch (error) {
                                                        setIsUpdatingId(null);
                                                        toast.error(
                                                            error instanceof
                                                                Error
                                                                ? error.message
                                                                : "Failed to update warehouse."
                                                        );
                                                    }
                                                }}
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
                                                onClick={async () => {
                                                    try {
                                                        setIsUpdatingId(
                                                            warehouse.id
                                                        );
                                                        await archiveWarehouse({
                                                            data: {
                                                                id: warehouse.id,
                                                            },
                                                        });
                                                        toast.success(
                                                            "Warehouse archived."
                                                        );
                                                        await router.invalidate();
                                                        setIsUpdatingId(null);
                                                    } catch (error) {
                                                        setIsUpdatingId(null);
                                                        toast.error(
                                                            error instanceof
                                                                Error
                                                                ? error.message
                                                                : "Failed to archive warehouse."
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
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}
