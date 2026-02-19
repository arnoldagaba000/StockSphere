import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
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
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { createCustomer } from "@/features/customers/create-customer";
import { getCustomers } from "@/features/customers/get-customers";
import {
    deleteCustomer,
    setCustomerActive,
    updateCustomer,
} from "@/features/customers/update-customer";

interface CustomerFormState {
    code: string;
    creditLimit: string;
    email: string;
    name: string;
    paymentTerms: string;
    phone: string;
}

const emptyForm: CustomerFormState = {
    code: "",
    creditLimit: "",
    email: "",
    name: "",
    paymentTerms: "",
    phone: "",
};

const toOptional = (value: string): string | null => {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

export const Route = createFileRoute("/_dashboard/customers")({
    component: CustomersPage,
    loader: () => getCustomers({ data: {} }),
});

function CustomersPage() {
    const customers = Route.useLoaderData();

    const [list, setList] = useState(customers);
    const [form, setForm] = useState<CustomerFormState>(emptyForm);
    const [editingCustomerId, setEditingCustomerId] = useState<string | null>(
        null
    );
    const [pendingDeleteCustomerId, setPendingDeleteCustomerId] = useState<
        string | null
    >(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isRowBusyId, setIsRowBusyId] = useState<string | null>(null);
    const [statusFilter, setStatusFilter] = useState<
        "all" | "active" | "inactive"
    >("all");
    const [search, setSearch] = useState("");

    const editingCustomer = useMemo(
        () => list.find((customer) => customer.id === editingCustomerId),
        [editingCustomerId, list]
    );

    const filteredCustomers = useMemo(() => {
        const normalizedSearch = search.trim().toLowerCase();

        return list.filter((customer) => {
            if (statusFilter === "active" && !customer.isActive) {
                return false;
            }
            if (statusFilter === "inactive" && customer.isActive) {
                return false;
            }

            if (normalizedSearch.length === 0) {
                return true;
            }

            return (
                customer.code.toLowerCase().includes(normalizedSearch) ||
                customer.name.toLowerCase().includes(normalizedSearch) ||
                (customer.email ?? "")
                    .toLowerCase()
                    .includes(normalizedSearch) ||
                (customer.phone ?? "").toLowerCase().includes(normalizedSearch)
            );
        });
    }, [list, search, statusFilter]);

    const reload = async () => {
        const fresh = await getCustomers({ data: {} });
        setList(fresh);
    };

    const updateForm = (
        field: keyof CustomerFormState,
        value: string
    ): void => {
        setForm((current) => ({ ...current, [field]: value }));
    };

    const resetForm = (): void => {
        setEditingCustomerId(null);
        setForm(emptyForm);
    };

    const loadCustomerIntoForm = (customerId: string): void => {
        const customer = list.find((entry) => entry.id === customerId);
        if (!customer) {
            return;
        }

        setEditingCustomerId(customer.id);
        setForm({
            code: customer.code,
            creditLimit:
                customer.creditLimit !== null
                    ? String(customer.creditLimit)
                    : "",
            email: customer.email ?? "",
            name: customer.name,
            paymentTerms: customer.paymentTerms ?? "",
            phone: customer.phone ?? "",
        });
    };

    const handleSaveCustomer = async (): Promise<void> => {
        if (form.name.trim().length === 0) {
            toast.error("Customer name is required.");
            return;
        }

        try {
            setIsSubmitting(true);

            if (editingCustomerId) {
                await updateCustomer({
                    data: {
                        address: null,
                        city: null,
                        country: null,
                        creditLimit:
                            form.creditLimit.trim().length > 0
                                ? Number(form.creditLimit)
                                : null,
                        customerId: editingCustomerId,
                        email: toOptional(form.email),
                        name: form.name.trim(),
                        paymentTerms: toOptional(form.paymentTerms),
                        phone: toOptional(form.phone),
                        taxId: null,
                    },
                });
                toast.success("Customer updated.");
            } else {
                if (form.code.trim().length === 0) {
                    toast.error("Customer code is required.");
                    return;
                }

                await createCustomer({
                    data: {
                        address: null,
                        city: null,
                        code: form.code.trim().toUpperCase(),
                        country: null,
                        creditLimit:
                            form.creditLimit.trim().length > 0
                                ? Number(form.creditLimit)
                                : null,
                        email: toOptional(form.email),
                        isActive: true,
                        name: form.name.trim(),
                        paymentTerms: toOptional(form.paymentTerms),
                        phone: toOptional(form.phone),
                        taxId: null,
                    },
                });
                toast.success("Customer created.");
            }

            resetForm();
            await reload();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save customer."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleActive = async (customerId: string) => {
        const customer = list.find((entry) => entry.id === customerId);
        if (!customer) {
            return;
        }

        try {
            setIsRowBusyId(customer.id);
            await setCustomerActive({
                data: {
                    customerId: customer.id,
                    isActive: !customer.isActive,
                },
            });
            toast.success(
                customer.isActive
                    ? "Customer deactivated."
                    : "Customer activated."
            );
            await reload();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to change customer status."
            );
        } finally {
            setIsRowBusyId(null);
        }
    };

    const handleDeleteCustomer = async (customerId: string) => {
        if (pendingDeleteCustomerId !== customerId) {
            setPendingDeleteCustomerId(customerId);
            return;
        }

        try {
            setIsRowBusyId(customerId);
            await deleteCustomer({ data: { customerId } });
            toast.success("Customer deleted.");
            setPendingDeleteCustomerId(null);
            if (editingCustomerId === customerId) {
                resetForm();
            }
            await reload();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete customer."
            );
        } finally {
            setIsRowBusyId(null);
        }
    };

    const handleSaveCustomerClick = () => {
        handleSaveCustomer().catch(() => undefined);
    };

    const saveButtonLabel = (() => {
        if (isSubmitting) {
            return "Saving...";
        }
        if (editingCustomer) {
            return "Save Changes";
        }
        return "Create Customer";
    })();

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Customers</h1>
                <p className="text-muted-foreground text-sm">
                    Create and manage customer records used for sales orders.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>
                        {editingCustomer ? "Edit Customer" : "Create Customer"}
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    {editingCustomer ? null : (
                        <div className="space-y-2">
                            <Label htmlFor="customer-code">Code</Label>
                            <Input
                                id="customer-code"
                                onChange={(event) =>
                                    updateForm(
                                        "code",
                                        event.target.value.toUpperCase()
                                    )
                                }
                                placeholder="CUS-0001"
                                value={form.code}
                            />
                        </div>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="customer-name">Name</Label>
                        <Input
                            id="customer-name"
                            onChange={(event) =>
                                updateForm("name", event.target.value)
                            }
                            placeholder="Customer Name"
                            value={form.name}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customer-email">Email</Label>
                        <Input
                            id="customer-email"
                            onChange={(event) =>
                                updateForm("email", event.target.value)
                            }
                            placeholder="client@example.com"
                            type="email"
                            value={form.email}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customer-phone">Phone</Label>
                        <Input
                            id="customer-phone"
                            onChange={(event) =>
                                updateForm("phone", event.target.value)
                            }
                            placeholder="+256..."
                            value={form.phone}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customer-terms">Payment Terms</Label>
                        <Input
                            id="customer-terms"
                            onChange={(event) =>
                                updateForm("paymentTerms", event.target.value)
                            }
                            placeholder="NET 30"
                            value={form.paymentTerms}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="customer-credit">
                            Credit Limit (UGX)
                        </Label>
                        <Input
                            id="customer-credit"
                            min={0}
                            onChange={(event) =>
                                updateForm("creditLimit", event.target.value)
                            }
                            placeholder="0"
                            type="number"
                            value={form.creditLimit}
                        />
                    </div>
                    <div className="flex gap-2 md:col-span-3">
                        <Button
                            disabled={
                                isSubmitting ||
                                form.name.trim().length === 0 ||
                                (!editingCustomer &&
                                    form.code.trim().length === 0)
                            }
                            onClick={handleSaveCustomerClick}
                            type="button"
                        >
                            {saveButtonLabel}
                        </Button>
                        {editingCustomer ? (
                            <Button
                                onClick={resetForm}
                                type="button"
                                variant="outline"
                            >
                                Cancel Edit
                            </Button>
                        ) : null}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Customer Directory</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="customer-search">Search</Label>
                            <Input
                                id="customer-search"
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                placeholder="Search by code, name, email, phone"
                                value={search}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Status</Label>
                            <Select
                                onValueChange={(value) =>
                                    setStatusFilter(
                                        (value ?? "all") as
                                            | "all"
                                            | "active"
                                            | "inactive"
                                    )
                                }
                                value={statusFilter}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All</SelectItem>
                                    <SelectItem value="active">
                                        Active
                                    </SelectItem>
                                    <SelectItem value="inactive">
                                        Inactive
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Code</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead className="text-right">
                                    Credit Limit
                                </TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={6}
                                    >
                                        No customers found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((customer) => (
                                    <TableRow key={customer.id}>
                                        <TableCell>{customer.code}</TableCell>
                                        <TableCell>{customer.name}</TableCell>
                                        <TableCell>
                                            <div className="text-sm">
                                                <div>
                                                    {customer.email ?? "-"}
                                                </div>
                                                <div className="text-muted-foreground">
                                                    {customer.phone ?? "-"}
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {(
                                                customer.creditLimit ?? 0
                                            ).toLocaleString()}
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    customer.isActive
                                                        ? "secondary"
                                                        : "outline"
                                                }
                                            >
                                                {customer.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button
                                                    onClick={() =>
                                                        loadCustomerIntoForm(
                                                            customer.id
                                                        )
                                                    }
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    disabled={
                                                        isRowBusyId ===
                                                        customer.id
                                                    }
                                                    onClick={() => {
                                                        handleToggleActive(
                                                            customer.id
                                                        ).catch(
                                                            () => undefined
                                                        );
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    {customer.isActive
                                                        ? "Deactivate"
                                                        : "Activate"}
                                                </Button>
                                                <Button
                                                    disabled={
                                                        isRowBusyId ===
                                                        customer.id
                                                    }
                                                    onClick={() => {
                                                        handleDeleteCustomer(
                                                            customer.id
                                                        ).catch(
                                                            () => undefined
                                                        );
                                                    }}
                                                    size="sm"
                                                    type="button"
                                                    variant={
                                                        pendingDeleteCustomerId ===
                                                        customer.id
                                                            ? "destructive"
                                                            : "outline"
                                                    }
                                                >
                                                    {pendingDeleteCustomerId ===
                                                    customer.id
                                                        ? "Confirm"
                                                        : "Delete"}
                                                </Button>
                                            </div>
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
