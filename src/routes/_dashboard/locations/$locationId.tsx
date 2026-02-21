import { createFileRoute, Link } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { getLocation } from "@/features/location/get-location";

const SHORT_ID_LENGTH = 8;

export const Route = createFileRoute("/_dashboard/locations/$locationId")({
    component: LocationDetailPage,
    loader: ({ params }) =>
        getLocation({
            data: {
                id: params.locationId,
            },
        }),
});

function LocationDetailPage() {
    const location = Route.useLoaderData();

    return (
        <section className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="font-semibold text-2xl">{location.name}</h1>
                    <p className="text-muted-foreground text-sm">
                        Location detail view
                    </p>
                </div>
                <Button
                    nativeButton={false}
                    render={<Link to="/locations" />}
                    variant="outline"
                >
                    Back to Locations
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Code
                        </p>
                        <p className="font-semibold text-xl">{location.code}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Type
                        </p>
                        <Badge variant="outline">{location.type}</Badge>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Status
                        </p>
                        <Badge
                            variant={location.isActive ? "secondary" : "ghost"}
                        >
                            {location.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Location ID
                        </p>
                        <p className="font-mono text-sm">
                            {location.id.slice(0, SHORT_ID_LENGTH)}
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
                                    Warehouse
                                </TableCell>
                                <TableCell>
                                    {location.warehouse.name} (
                                    {location.warehouse.code})
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Warehouse ID
                                </TableCell>
                                <TableCell className="font-mono text-sm">
                                    {location.warehouse.id.slice(
                                        0,
                                        SHORT_ID_LENGTH
                                    )}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Stock Buckets
                                </TableCell>
                                <TableCell>
                                    {location._count.stockItems}
                                </TableCell>
                            </TableRow>
                            <TableRow>
                                <TableCell className="text-muted-foreground">
                                    Receipt Rows
                                </TableCell>
                                <TableCell>
                                    {location._count.goodsReceiptItems}
                                </TableCell>
                            </TableRow>
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}
