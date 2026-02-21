import { createFileRoute, Link } from "@tanstack/react-router";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getSupplier } from "@/features/purchases/get-supplier";
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

const SHORT_ID_LENGTH = 8;

export const Route = createFileRoute("/_dashboard/suppliers/$supplierId")({
    component: SupplierDetailPage,
    loader: async ({ params }) => {
        const [supplier, financialSettings] = await Promise.all([
            getSupplier({
                data: {
                    id: params.supplierId,
                },
            }),
            getFinancialSettings(),
        ]);

        return {
            financialSettings,
            supplier,
        };
    },
});

function SupplierDetailPage() {
    const { financialSettings, supplier } = Route.useLoaderData();

    return (
        <section className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="font-semibold text-2xl">{supplier.name}</h1>
                    <p className="text-muted-foreground text-sm">
                        Supplier detail view
                    </p>
                </div>
                <Button
                    nativeButton={false}
                    render={<Link to="/suppliers" />}
                    variant="outline"
                >
                    Back to Suppliers
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Code
                        </p>
                        <p className="font-semibold text-xl">{supplier.code}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Products
                        </p>
                        <p className="font-semibold text-2xl">
                            {supplier._count.products}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Purchase Orders
                        </p>
                        <p className="font-semibold text-2xl">
                            {supplier._count.purchaseOrders}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Status
                        </p>
                        <Badge
                            variant={supplier.isActive ? "secondary" : "ghost"}
                        >
                            {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        <span className="text-muted-foreground">ID:</span>{" "}
                        <span className="font-mono">
                            {supplier.id.slice(0, SHORT_ID_LENGTH)}
                        </span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">Contact:</span>{" "}
                        {supplier.contactPerson ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {supplier.email ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        {supplier.phone ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">
                            Payment Terms:
                        </span>{" "}
                        {supplier.paymentTerms ?? "\u2014"}
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>Recent Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {supplier.purchaseOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={4}
                                    >
                                        No purchase orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                supplier.purchaseOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            {order.orderNumber}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                order.orderDate
                                            ).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{order.status}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrencyFromMinorUnits(
                                                order.totalAmount,
                                                financialSettings.currencyCode
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}
