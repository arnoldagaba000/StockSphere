import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
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
import {
    deleteSupplier,
    setSupplierActive,
    updateSupplier,
} from "@/features/purchases/update-supplier";

type SupplierRecord = Awaited<ReturnType<typeof getSuppliers>>[number];

interface SupplierFormState {
    code: string;
    contactPerson: string;
    email: string;
    name: string;
    paymentTerms: string;
    phone: string;
}

const emptySupplierForm: SupplierFormState = {
    code: "",
    contactPerson: "",
    email: "",
    name: "",
    paymentTerms: "",
    phone: "",
};

const toOptionalValue = (value: string): string | null => {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

export const Route = createFileRoute("/_dashboard/suppliers")({
    component: SuppliersPage,
    loader: () => getSuppliers({ data: { includeInactive: true } }),
});

function SuppliersPage() {
    const router = useRouter();
    const suppliers = Route.useLoaderData();
    const [form, setForm] = useState<SupplierFormState>(emptySupplierForm);
    const [editingSupplierId, setEditingSupplierId] = useState<string | null>(
        null
    );
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRowBusyId, setIsRowBusyId] = useState<string | null>(null);
    const [pendingDeleteSupplierId, setPendingDeleteSupplierId] = useState<
        string | null
    >(null);

    const editingSupplier = useMemo(
        () => suppliers.find((supplier) => supplier.id === editingSupplierId),
        [editingSupplierId, suppliers]
    );

    const updateFormField = (
        field: keyof SupplierFormState,
        value: string
    ): void => {
        setForm((currentForm) => ({ ...currentForm, [field]: value }));
    };

    const loadSupplierIntoForm = (supplier: SupplierRecord): void => {
        setEditingSupplierId(supplier.id);
        setForm({
            code: supplier.code,
            contactPerson: supplier.contactPerson ?? "",
            email: supplier.email ?? "",
            name: supplier.name,
            paymentTerms: supplier.paymentTerms ?? "",
            phone: supplier.phone ?? "",
        });
    };

    const resetForm = (): void => {
        setEditingSupplierId(null);
        setForm(emptySupplierForm);
    };

    const refresh = async (): Promise<void> => {
        await router.invalidate();
    };

    const createSupplierInput = () => ({
        address: null,
        city: null,
        code: form.code.trim().toUpperCase(),
        contactPerson: toOptionalValue(form.contactPerson),
        country: null,
        email: toOptionalValue(form.email),
        isActive: true,
        name: form.name.trim(),
        paymentTerms: toOptionalValue(form.paymentTerms),
        phone: toOptionalValue(form.phone),
        taxId: null,
    });

    const updateSupplierInput = (supplierId: string) => ({
        contactPerson: toOptionalValue(form.contactPerson),
        email: toOptionalValue(form.email),
        name: form.name.trim(),
        paymentTerms: toOptionalValue(form.paymentTerms),
        phone: toOptionalValue(form.phone),
        supplierId,
    });

    const saveExistingSupplier = async (supplierId: string) => {
        await updateSupplier({
            data: updateSupplierInput(supplierId),
        });
        toast.success("Supplier updated.");
    };

    const createNewSupplier = async () => {
        await createSupplier({ data: createSupplierInput() });
        toast.success("Supplier created.");
    };

    const handleSaveSupplier = async (): Promise<void> => {
        try {
            setIsSubmitting(true);
            if (editingSupplierId) {
                await saveExistingSupplier(editingSupplierId);
            } else {
                await createNewSupplier();
            }
            resetForm();
            await refresh();
            setIsSubmitting(false);
        } catch (error) {
            setIsSubmitting(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save supplier."
            );
        }
    };

    const handleToggleSupplierActive = async (supplier: SupplierRecord) => {
        try {
            setIsRowBusyId(supplier.id);
            await setSupplierActive({
                data: {
                    isActive: !supplier.isActive,
                    supplierId: supplier.id,
                },
            });
            toast.success(
                supplier.isActive
                    ? "Supplier deactivated."
                    : "Supplier activated."
            );
            await refresh();
            setIsRowBusyId(null);
        } catch (error) {
            setIsRowBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update supplier status."
            );
        }
    };

    const handleDeleteSupplier = async (supplier: SupplierRecord) => {
        if (pendingDeleteSupplierId !== supplier.id) {
            setPendingDeleteSupplierId(supplier.id);
            return;
        }

        try {
            setIsRowBusyId(supplier.id);
            await deleteSupplier({
                data: { supplierId: supplier.id },
            });
            toast.success("Supplier deleted.");
            setPendingDeleteSupplierId(null);
            if (editingSupplierId === supplier.id) {
                resetForm();
            }
            await refresh();
            setIsRowBusyId(null);
        } catch (error) {
            setIsRowBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete supplier."
            );
        }
    };

    const getSaveButtonLabel = (): string => {
        if (isSubmitting) {
            return "Saving...";
        }
        if (editingSupplier) {
            return "Save Changes";
        }
        return "Create Supplier";
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Suppliers</h1>
                <p className="text-muted-foreground text-sm">
                    Manage suppliers, including profile updates, activation
                    status, and deletion controls.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {editingSupplier ? "Edit Supplier" : "Create Supplier"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    {editingSupplier ? null : (
                        <div className="space-y-2">
                            <Label htmlFor="supplier-code">Code</Label>
                            <Input
                                id="supplier-code"
                                onChange={(event) =>
                                    updateFormField(
                                        "code",
                                        event.target.value.toUpperCase()
                                    )
                                }
                                placeholder="SUP-0001"
                                value={form.code}
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="supplier-name">Name</Label>
                        <Input
                            id="supplier-name"
                            onChange={(event) =>
                                updateFormField("name", event.target.value)
                            }
                            placeholder="Supplier Name"
                            value={form.name}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-contact">Contact Person</Label>
                        <Input
                            id="supplier-contact"
                            onChange={(event) =>
                                updateFormField(
                                    "contactPerson",
                                    event.target.value
                                )
                            }
                            value={form.contactPerson}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-email">Email</Label>
                        <Input
                            id="supplier-email"
                            onChange={(event) =>
                                updateFormField("email", event.target.value)
                            }
                            type="email"
                            value={form.email}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-phone">Phone</Label>
                        <Input
                            id="supplier-phone"
                            onChange={(event) =>
                                updateFormField("phone", event.target.value)
                            }
                            value={form.phone}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="supplier-payment">Payment Terms</Label>
                        <Input
                            id="supplier-payment"
                            onChange={(event) =>
                                updateFormField(
                                    "paymentTerms",
                                    event.target.value
                                )
                            }
                            placeholder="Net 30"
                            value={form.paymentTerms}
                        />
                    </div>
                    <div className="flex gap-2 md:col-span-3">
                        <Button
                            disabled={
                                isSubmitting ||
                                (!editingSupplier &&
                                    form.code.trim().length === 0) ||
                                form.name.trim().length === 0
                            }
                            onClick={handleSaveSupplier}
                        >
                            {getSaveButtonLabel()}
                        </Button>
                        {editingSupplier ? (
                            <Button onClick={resetForm} variant="outline">
                                Cancel Edit
                            </Button>
                        ) : null}
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
                                <TableHead>Status</TableHead>
                                <TableHead>Products</TableHead>
                                <TableHead>POs</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {suppliers.map((supplier) => (
                                <TableRow key={supplier.id}>
                                    <TableCell>{supplier.code}</TableCell>
                                    <TableCell>{supplier.name}</TableCell>
                                    <TableCell>
                                        {supplier.contactPerson ?? "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                supplier.isActive
                                                    ? "default"
                                                    : "secondary"
                                            }
                                        >
                                            {supplier.isActive
                                                ? "Active"
                                                : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {supplier._count.products}
                                    </TableCell>
                                    <TableCell>
                                        {supplier._count.purchaseOrders}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex flex-wrap justify-end gap-2">
                                            <Button
                                                disabled={
                                                    isRowBusyId === supplier.id
                                                }
                                                onClick={() =>
                                                    loadSupplierIntoForm(
                                                        supplier
                                                    )
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                disabled={
                                                    isRowBusyId === supplier.id
                                                }
                                                onClick={() =>
                                                    handleToggleSupplierActive(
                                                        supplier
                                                    )
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                {supplier.isActive
                                                    ? "Deactivate"
                                                    : "Activate"}
                                            </Button>
                                            {pendingDeleteSupplierId ===
                                            supplier.id ? (
                                                <Button
                                                    disabled={
                                                        isRowBusyId ===
                                                        supplier.id
                                                    }
                                                    onClick={() =>
                                                        handleDeleteSupplier(
                                                            supplier
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    Confirm Delete
                                                </Button>
                                            ) : (
                                                <Button
                                                    disabled={
                                                        isRowBusyId ===
                                                        supplier.id
                                                    }
                                                    onClick={() =>
                                                        handleDeleteSupplier(
                                                            supplier
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    Delete
                                                </Button>
                                            )}
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
