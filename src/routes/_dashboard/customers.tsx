import {
    createFileRoute,
    Link,
    Outlet,
    useLocation,
    useRouter,
} from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
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
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

interface CustomerFormState {
    address: string;
    city: string;
    code: string;
    country: string;
    creditLimit: string;
    email: string;
    name: string;
    paymentTerms: string;
    phone: string;
    taxId: string;
}

const emptyForm: CustomerFormState = {
    address: "",
    city: "",
    code: "",
    country: "",
    creditLimit: "",
    email: "",
    name: "",
    paymentTerms: "",
    phone: "",
    taxId: "",
};

const toOptional = (value: string): string | null => {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

type CustomerListItem = Awaited<ReturnType<typeof getCustomers>>[number];

interface CustomersPageState {
    editingCustomerId: string | null;
    form: CustomerFormState;
    isRowBusyId: string | null;
    isSubmitting: boolean;
    pendingDeleteCustomerId: string | null;
    recordsView: "live" | "archived";
    search: string;
    statusFilter: "all" | "active" | "inactive";
}

type CustomersPageAction =
    | Partial<CustomersPageState>
    | ((state: CustomersPageState) => Partial<CustomersPageState>);

const customersPageReducer = (
    state: CustomersPageState,
    action: CustomersPageAction
): CustomersPageState => {
    const patch = typeof action === "function" ? action(state) : action;
    return { ...state, ...patch };
};

export const Route = createFileRoute("/_dashboard/customers")({
    component: CustomersPage,
    loader: async () => {
        const [archivedCustomers, financialSettings, liveCustomers] =
            await Promise.all([
                getCustomers({ data: { archivedOnly: true } }),
                getFinancialSettings(),
                getCustomers({ data: {} }),
            ]);

        return {
            archivedCustomers,
            financialSettings,
            liveCustomers,
        };
    },
});

interface CustomerFormProps {
    currencyCode: string;
    editingCustomer: CustomerListItem | undefined;
    form: CustomerFormState;
    isSubmitting: boolean;
    onFormFieldChange: (field: keyof CustomerFormState, value: string) => void;
    onResetForm: () => void;
    onSaveClick: () => void;
}

const CustomerForm = ({
    currencyCode,
    editingCustomer,
    form,
    isSubmitting,
    onFormFieldChange,
    onResetForm,
    onSaveClick,
}: CustomerFormProps) => {
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
                                onFormFieldChange(
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
                            onFormFieldChange("name", event.target.value)
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
                            onFormFieldChange("email", event.target.value)
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
                            onFormFieldChange("phone", event.target.value)
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
                            onFormFieldChange(
                                "paymentTerms",
                                event.target.value
                            )
                        }
                        placeholder="NET 30"
                        value={form.paymentTerms}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customer-credit">
                        Credit Limit ({currencyCode})
                    </Label>
                    <Input
                        id="customer-credit"
                        min={0}
                        onChange={(event) =>
                            onFormFieldChange("creditLimit", event.target.value)
                        }
                        placeholder="0"
                        type="number"
                        value={form.creditLimit}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customer-tax-id">Tax ID</Label>
                    <Input
                        id="customer-tax-id"
                        onChange={(event) =>
                            onFormFieldChange("taxId", event.target.value)
                        }
                        placeholder="TIN/VAT number"
                        value={form.taxId}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customer-country">Country</Label>
                    <Input
                        id="customer-country"
                        onChange={(event) =>
                            onFormFieldChange("country", event.target.value)
                        }
                        placeholder="Country"
                        value={form.country}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="customer-city">City</Label>
                    <Input
                        id="customer-city"
                        onChange={(event) =>
                            onFormFieldChange("city", event.target.value)
                        }
                        placeholder="City / Town"
                        value={form.city}
                    />
                </div>
                <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="customer-address">Address</Label>
                    <Input
                        id="customer-address"
                        onChange={(event) =>
                            onFormFieldChange("address", event.target.value)
                        }
                        placeholder="Street / Building / Box"
                        value={form.address}
                    />
                </div>
                <div className="flex gap-2 md:col-span-3">
                    <Button
                        disabled={
                            isSubmitting ||
                            form.name.trim().length === 0 ||
                            (!editingCustomer && form.code.trim().length === 0)
                        }
                        onClick={onSaveClick}
                        type="button"
                    >
                        {saveButtonLabel}
                    </Button>
                    {editingCustomer ? (
                        <Button
                            onClick={onResetForm}
                            type="button"
                            variant="outline"
                        >
                            Cancel Edit
                        </Button>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
};

interface CustomersTableProps {
    filteredCustomers: CustomerListItem[];
    isRowBusyId: string | null;
    onDeleteCustomer: (customerId: string) => void;
    onEditCustomer: (customerId: string) => void;
    onRecordsViewChange: (recordsView: "live" | "archived") => void;
    onSearchChange: (value: string) => void;
    onStatusFilterChange: (value: "all" | "active" | "inactive" | null) => void;
    onToggleActive: (customerId: string) => void;
    pendingDeleteCustomerId: string | null;
    recordsView: "live" | "archived";
    search: string;
    statusFilter: "all" | "active" | "inactive";
}

interface CustomerRowProps {
    customer: CustomerListItem;
    isRowBusyId: string | null;
    onDeleteCustomer: (customerId: string) => void;
    onEditCustomer: (customerId: string) => void;
    onToggleActive: (customerId: string) => void;
    pendingDeleteCustomerId: string | null;
    recordsView: "live" | "archived";
}

const CustomerRow = ({
    customer,
    isRowBusyId,
    onDeleteCustomer,
    onEditCustomer,
    onToggleActive,
    pendingDeleteCustomerId,
    recordsView,
}: CustomerRowProps) => {
    return (
        <TableRow key={customer.id}>
            <TableCell>{customer.code}</TableCell>
            <TableCell>{customer.name}</TableCell>
            <TableCell>
                <div className="text-sm">
                    <div>{customer.email ?? "-"}</div>
                    <div className="text-muted-foreground">
                        {customer.phone ?? "-"}
                    </div>
                </div>
            </TableCell>
            <TableCell className="text-right">
                {(customer.creditLimit ?? 0).toLocaleString()}
            </TableCell>
            <TableCell>
                <Badge variant={customer.isActive ? "secondary" : "outline"}>
                    {customer.isActive ? "Active" : "Inactive"}
                </Badge>
            </TableCell>
            <TableCell>
                <div className="flex gap-2">
                    <Button
                        nativeButton={false}
                        render={
                            <Link
                                params={{
                                    customerId: customer.id,
                                }}
                                to="/customers/$customerId"
                            />
                        }
                        size="sm"
                        type="button"
                        variant="outline"
                    >
                        View
                    </Button>
                    {recordsView === "live" ? (
                        <>
                            <Button
                                onClick={() => onEditCustomer(customer.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                            >
                                Edit
                            </Button>
                            <Button
                                disabled={isRowBusyId === customer.id}
                                onClick={() => onToggleActive(customer.id)}
                                size="sm"
                                type="button"
                                variant="outline"
                            >
                                {customer.isActive ? "Deactivate" : "Activate"}
                            </Button>
                            <Button
                                disabled={isRowBusyId === customer.id}
                                onClick={() => onDeleteCustomer(customer.id)}
                                size="sm"
                                type="button"
                                variant={
                                    pendingDeleteCustomerId === customer.id
                                        ? "destructive"
                                        : "outline"
                                }
                            >
                                {pendingDeleteCustomerId === customer.id
                                    ? "Confirm"
                                    : "Delete"}
                            </Button>
                        </>
                    ) : null}
                </div>
            </TableCell>
        </TableRow>
    );
};

const CustomersTable = ({
    filteredCustomers,
    isRowBusyId,
    onDeleteCustomer,
    onEditCustomer,
    onRecordsViewChange,
    onSearchChange,
    onStatusFilterChange,
    onToggleActive,
    pendingDeleteCustomerId,
    recordsView,
    search,
    statusFilter,
}: CustomersTableProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Customer Directory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="customer-search">Search</Label>
                        <Input
                            id="customer-search"
                            onChange={(event) =>
                                onSearchChange(event.target.value)
                            }
                            placeholder="Search by code, name, email, phone"
                            value={search}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Status</Label>
                        <Select
                            onValueChange={onStatusFilterChange}
                            value={statusFilter}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="active">Active</SelectItem>
                                <SelectItem value="inactive">
                                    Inactive
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Record View</Label>
                        <Select
                            onValueChange={(value) =>
                                onRecordsViewChange(
                                    (value as "live" | "archived") ?? "live"
                                )
                            }
                            value={recordsView}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="live">
                                    Live records
                                </SelectItem>
                                <SelectItem value="archived">
                                    Archived records
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
                                <CustomerRow
                                    customer={customer}
                                    isRowBusyId={isRowBusyId}
                                    key={customer.id}
                                    onDeleteCustomer={onDeleteCustomer}
                                    onEditCustomer={onEditCustomer}
                                    onToggleActive={onToggleActive}
                                    pendingDeleteCustomerId={
                                        pendingDeleteCustomerId
                                    }
                                    recordsView={recordsView}
                                />
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

function CustomersPage() {
    const location = useLocation();
    const router = useRouter();
    const { archivedCustomers, financialSettings, liveCustomers } =
        Route.useLoaderData();
    const [state, setState] = useReducer(customersPageReducer, {
        editingCustomerId: null,
        form: emptyForm,
        isRowBusyId: null,
        isSubmitting: false,
        pendingDeleteCustomerId: null,
        recordsView: "live",
        search: "",
        statusFilter: "all" as "all" | "active" | "inactive",
    });
    const {
        editingCustomerId,
        form,
        isRowBusyId,
        isSubmitting,
        pendingDeleteCustomerId,
        recordsView,
        search,
        statusFilter,
    } = state;
    const list = recordsView === "archived" ? archivedCustomers : liveCustomers;

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
        await router.invalidate();
    };

    const updateForm = (
        field: keyof CustomerFormState,
        value: string
    ): void => {
        setState((prev) => ({ form: { ...prev.form, [field]: value } }));
    };

    const resetForm = (): void => {
        setState({ editingCustomerId: null, form: emptyForm });
    };

    const loadCustomerIntoForm = (customerId: string): void => {
        const customer = list.find((entry) => entry.id === customerId);
        if (!customer) {
            return;
        }

        setState({
            editingCustomerId: customer.id,
            form: {
                address: customer.address ?? "",
                city: customer.city ?? "",
                code: customer.code,
                country: customer.country ?? "",
                creditLimit:
                    customer.creditLimit !== null
                        ? String(customer.creditLimit)
                        : "",
                email: customer.email ?? "",
                name: customer.name,
                paymentTerms: customer.paymentTerms ?? "",
                phone: customer.phone ?? "",
                taxId: customer.taxId ?? "",
            },
        });
    };

    const handleSaveCustomer = async (): Promise<void> => {
        if (form.name.trim().length === 0) {
            toast.error("Customer name is required.");
            return;
        }
        const creditLimitValue =
            form.creditLimit.trim().length > 0
                ? Number(form.creditLimit)
                : null;

        try {
            setState({ isSubmitting: true });

            if (editingCustomerId) {
                await updateCustomer({
                    data: {
                        address: toOptional(form.address),
                        city: toOptional(form.city),
                        country: toOptional(form.country),
                        creditLimit: creditLimitValue,
                        customerId: editingCustomerId,
                        email: toOptional(form.email),
                        name: form.name.trim(),
                        paymentTerms: toOptional(form.paymentTerms),
                        phone: toOptional(form.phone),
                        taxId: toOptional(form.taxId),
                    },
                });
                toast.success("Customer updated.");
            } else {
                if (form.code.trim().length === 0) {
                    toast.error("Customer code is required.");
                    setState({ isSubmitting: false });
                    return;
                }

                await createCustomer({
                    data: {
                        address: toOptional(form.address),
                        city: toOptional(form.city),
                        code: form.code.trim().toUpperCase(),
                        country: toOptional(form.country),
                        creditLimit: creditLimitValue,
                        email: toOptional(form.email),
                        isActive: true,
                        name: form.name.trim(),
                        paymentTerms: toOptional(form.paymentTerms),
                        phone: toOptional(form.phone),
                        taxId: toOptional(form.taxId),
                    },
                });
                toast.success("Customer created.");
            }

            resetForm();
            await reload();
            setState({ isSubmitting: false });
        } catch (error) {
            setState({ isSubmitting: false });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save customer."
            );
        }
    };

    const handleToggleActive = async (customerId: string) => {
        const customer = list.find((entry) => entry.id === customerId);
        if (!customer) {
            return;
        }
        const successMessage = customer.isActive
            ? "Customer deactivated."
            : "Customer activated.";

        try {
            setState({ isRowBusyId: customer.id });
            await setCustomerActive({
                data: {
                    customerId: customer.id,
                    isActive: !customer.isActive,
                },
            });
            toast.success(successMessage);
            await reload();
            setState({ isRowBusyId: null });
        } catch (error) {
            setState({ isRowBusyId: null });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to change customer status."
            );
        }
    };

    const handleDeleteCustomer = async (customerId: string) => {
        if (pendingDeleteCustomerId !== customerId) {
            setState({ pendingDeleteCustomerId: customerId });
            return;
        }

        try {
            setState({ isRowBusyId: customerId });
            await deleteCustomer({ data: { customerId } });
            toast.success("Customer deleted.");
            setState({ pendingDeleteCustomerId: null });
            if (editingCustomerId === customerId) {
                resetForm();
            }
            await reload();
            setState({ isRowBusyId: null });
        } catch (error) {
            setState({ isRowBusyId: null });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete customer."
            );
        }
    };

    const handleSaveCustomerClick = () => {
        handleSaveCustomer().catch(() => undefined);
    };

    if (location.pathname !== "/customers") {
        return <Outlet />;
    }

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Customers</h1>
                <p className="text-muted-foreground text-sm">
                    Create and manage customer records used for sales orders.
                </p>
            </div>

            {recordsView === "live" ? (
                <CustomerForm
                    currencyCode={financialSettings.currencyCode}
                    editingCustomer={editingCustomer}
                    form={form}
                    isSubmitting={isSubmitting}
                    onFormFieldChange={updateForm}
                    onResetForm={resetForm}
                    onSaveClick={handleSaveCustomerClick}
                />
            ) : null}

            <CustomersTable
                filteredCustomers={filteredCustomers}
                isRowBusyId={isRowBusyId}
                onDeleteCustomer={(customerId) => {
                    handleDeleteCustomer(customerId).catch(() => undefined);
                }}
                onEditCustomer={loadCustomerIntoForm}
                onRecordsViewChange={(nextView) =>
                    setState({
                        editingCustomerId: null,
                        form: emptyForm,
                        pendingDeleteCustomerId: null,
                        recordsView: nextView,
                        search: "",
                        statusFilter: "all",
                    })
                }
                onSearchChange={(value) => setState({ search: value })}
                onStatusFilterChange={(value) =>
                    setState({
                        statusFilter: (value ?? "all") as
                            | "all"
                            | "active"
                            | "inactive",
                    })
                }
                onToggleActive={(customerId) => {
                    handleToggleActive(customerId).catch(() => undefined);
                }}
                pendingDeleteCustomerId={pendingDeleteCustomerId}
                recordsView={recordsView}
                search={search}
                statusFilter={statusFilter}
            />
        </section>
    );
}
