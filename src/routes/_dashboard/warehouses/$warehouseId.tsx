import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { getWarehouse } from "@/features/inventory/get-warehouse";

const SHORT_ID_LENGTH = 8;

export const Route = createFileRoute("/_dashboard/warehouses/$warehouseId")({
    component: WarehouseDetailPage,
    loader: ({ params }) =>
        getWarehouse({
            data: {
                id: params.warehouseId,
            },
        }),
});

function WarehouseDetailPage() {
    const warehouse = Route.useLoaderData();

    return (
        <section className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="font-semibold text-2xl">{warehouse.name}</h1>
                    <p className="text-muted-foreground text-sm">
                        Warehouse detail view
                    </p>
                </div>
                <Button
                    nativeButton={false}
                    render={<Link to="/warehouses" />}
                    variant="outline"
                >
                    Back to Warehouses
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Status
                        </p>
                        <Badge
                            variant={warehouse.isActive ? "secondary" : "ghost"}
                        >
                            {warehouse.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Locations
                        </p>
                        <p className="font-semibold text-2xl">
                            {warehouse._count.locations}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Stock Buckets
                        </p>
                        <p className="font-semibold text-2xl">
                            {warehouse._count.stockItems}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Warehouse ID
                        </p>
                        <p className="font-mono text-sm">
                            {warehouse.id.slice(0, SHORT_ID_LENGTH)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>Details</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableBody>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Code
                                </TableCell>
                                <TableCell>{warehouse.code}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Country
                                </TableCell>
                                <TableCell>{warehouse.country}</TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    District
                                </TableCell>
                                <TableCell>
                                    {warehouse.district ?? "\u2014"}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Address
                                </TableCell>
                                <TableCell>
                                    {warehouse.address ?? "\u2014"}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Postal Code
                                </TableCell>
                                <TableCell>
                                    {warehouse.postalCode ?? "\u2014"}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>Locations (Latest 20)</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                    {warehouse.locations.length === 0 ? (
                        <p className="text-muted-foreground text-sm">
                            No locations in this warehouse.
                        </p>
                    ) : (
                        <div className="space-y-2">
                            {warehouse.locations.map((location) => (
                                <div
                                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 p-3"
                                    key={location.id}
                                >
                                    <div>
                                        <p className="font-medium">
                                            {location.code} - {location.name}
                                        </p>
                                        <p className="text-muted-foreground text-xs">
                                            {location.id.slice(
                                                0,
                                                SHORT_ID_LENGTH
                                            )}{" "}
                                            | {location.type}
                                        </p>
                                    </div>
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
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </section>
    );
}
