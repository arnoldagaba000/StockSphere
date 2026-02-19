import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createSupplier } from "@/features/purchases/create-supplier";
import { getSuppliers } from "@/features/purchases/get-suppliers";

export const Route = createFileRoute("/_dashboard/suppliers")({
    component: SuppliersPage,
    loader: () => getSuppliers({ data: {} }),
});

function SuppliersPage() {
    const router = useRouter();
    const suppliers = Route.useLoaderData();

    const [code, setCode] = useState("");
    const [name, setName] = useState("");
    const [contactPerson, setContactPerson] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [paymentTerms, setPaymentTerms] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleCreateSupplier = async () => {
        try {
            setIsSubmitting(true);
            await createSupplier({
                data: {
                    address: null,
                    city: null,
                    code: code.trim().toUpperCase(),
                    contactPerson:
                        contactPerson.trim().length > 0 ? contactPerson : null,
                    country: null,
                    email: email.trim().length > 0 ? email : null,
                    isActive: true,
                    name: name.trim(),
                    paymentTerms:
                        paymentTerms.trim().length > 0 ? paymentTerms : null,
                    phone: phone.trim().length > 0 ? phone : null,
                    taxId: null,
                },
            });
            toast.success("Supplier created.");
            setCode("");
            setName("");
            setContactPerson("");
            setEmail("");
            setPhone("");
            setPaymentTerms("");
            await router.invalidate();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create supplier."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Suppliers</h1>
                <p className="text-muted-foreground text-sm">
                    Manage supplier master data used during purchasing.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create Supplier</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="supplier-code">Code</Label>
                        <Input
                            id="supplier-code"
                            onChange={(event) =>
                                setCode(event.target.value.toUpperCase())
                            }
                            placeholder="SUP-0001"
                            value={code}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-name">Name</Label>
                        <Input
                            id="supplier-name"
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Supplier Name"
                            value={name}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-contact">Contact Person</Label>
                        <Input
                            id="supplier-contact"
                            onChange={(event) =>
                                setContactPerson(event.target.value)
                            }
                            value={contactPerson}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-email">Email</Label>
                        <Input
                            id="supplier-email"
                            onChange={(event) => setEmail(event.target.value)}
                            type="email"
                            value={email}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-phone">Phone</Label>
                        <Input
                            id="supplier-phone"
                            onChange={(event) => setPhone(event.target.value)}
                            value={phone}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-payment">Payment Terms</Label>
                        <Input
                            id="supplier-payment"
                            onChange={(event) =>
                                setPaymentTerms(event.target.value)
                            }
                            placeholder="Net 30"
                            value={paymentTerms}
                        />
                    </div>
                    <div className="md:col-span-3">
                        <Button
                            disabled={
                                isSubmitting ||
                                code.trim().length === 0 ||
                                name.trim().length === 0
                            }
                            onClick={handleCreateSupplier}
                        >
                            {isSubmitting ? "Creating..." : "Create Supplier"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Supplier List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Payment Terms</TableHead>
                                <TableHead>Products</TableHead>
                                <TableHead>POs</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={6}
                                    >
                                        No suppliers found.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {suppliers.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell>{supplier.code}</TableCell>
                                    <TableCell>{supplier.name}</TableCell>
                                    <TableCell>
                                        {supplier.contactPerson ?? "—"}
                                    </TableCell>
                                    <TableCell>
                                        {supplier.paymentTerms ?? "—"}
                                    </TableCell>
                                    <TableCell>
                                        {supplier._count.products}
                                    </TableCell>
                                    <TableCell>
                                        {supplier._count.purchaseOrders}
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
