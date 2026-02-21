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
import { getCustomer } from "@/features/customers/get-customer";
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

const SHORT_ID_LENGTH = 8;

export const Route = createFileRoute("/_dashboard/customers/$customerId")({
    component: CustomerDetailPage,
    loader: async ({ params }) => {
        const [customer, financialSettings] = await Promise.all([
            getCustomer({
                data: {
                    id: params.customerId,
                },
            }),
            getFinancialSettings(),
        ]);

        return {
            customer,
            financialSettings,
        };
    },
});

function CustomerDetailPage() {
    const { customer, financialSettings } = Route.useLoaderData();

    return (
        <section className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="font-semibold text-2xl">{customer.name}</h1>
                    <p className="text-muted-foreground text-sm">
                        Customer detail view
                    </p>
                </div>
                <Button
                    nativeButton={false}
                    render={<Link to="/customers" />}
                    variant="outline"
                >
                    Back to Customers
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Code
                        </p>
                        <p className="font-semibold text-xl">{customer.code}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Sales Orders
                        </p>
                        <p className="font-semibold text-2xl">
                            {customer._count.salesOrders}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Credit Limit
                        </p>
                        <p className="font-semibold text-lg">
                            {customer.creditLimit != null
                                ? formatCurrencyFromMinorUnits(
                                      customer.creditLimit,
                                      financialSettings.currencyCode
                                  )
                                : "\u2014"}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Status
                        </p>
                        <Badge
                            variant={customer.isActive ? "secondary" : "ghost"}
                        >
                            {customer.isActive ? "Active" : "Inactive"}
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
                            {customer.id.slice(0, SHORT_ID_LENGTH)}
                        </span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {customer.email ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        {customer.phone ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">
                            Payment Terms:
                        </span>{" "}
                        {customer.paymentTerms ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Tax ID:</span>{" "}
                        {customer.taxId ?? "\u2014"}
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>Recent Sales Orders</CardTitle>
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
                            {customer.salesOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={4}
                                    >
                                        No sales orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                customer.salesOrders.map((order) => (
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
