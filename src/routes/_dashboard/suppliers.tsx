import {
    createFileRoute,
    Link,
    Outlet,
    useLocation,
    useRouter,
} from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import {
    RouteErrorFallback,
    RoutePendingFallback,
} from "@/components/layout/route-feedback";
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
import { createSupplier } from "@/features/purchases/create-supplier";
import { getSuppliers } from "@/features/purchases/get-suppliers";
import {
    deleteSupplier,
    setSupplierActive,
    updateSupplier,
} from "@/features/purchases/update-supplier";

type SupplierRecord = Awaited<ReturnType<typeof getSuppliers>>[number];

interface SupplierFormState {
    address: string;
    city: string;
    code: string;
    contactPerson: string;
    country: string;
    email: string;
    name: string;
    paymentTerms: string;
    phone: string;
    taxId: string;
}

const emptySupplierForm: SupplierFormState = {
    address: "",
    city: "",
    code: "",
    contactPerson: "",
    country: "",
    email: "",
    name: "",
    paymentTerms: "",
    phone: "",
    taxId: "",
};

const toOptionalValue = (value: string): string | null => {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

interface SuppliersPageState {
    editingSupplierId: string | null;
    form: SupplierFormState;
    isRowBusyId: string | null;
    isSubmitting: boolean;
    pendingDeleteSupplierId: string | null;
    recordsView: "live" | "archived";
}

type SuppliersPageAction =
    | {
          patch: Partial<SuppliersPageState>;
          type: "patch";
      }
    | {
          field: keyof SupplierFormState;
          type: "patchForm";
          value: string;
      };

const suppliersPageReducer = (
    state: SuppliersPageState,
    action: SuppliersPageAction
): SuppliersPageState => {
    if (action.type === "patch") {
        return {
            ...state,
            ...action.patch,
        };
    }

    return {
        ...state,
        form: {
            ...state.form,
            [action.field]: action.value,
        },
    };
};

interface SupplierFormCardProps {
    editingSupplier: SupplierRecord | undefined;
    form: SupplierFormState;
    isSubmitting: boolean;
    onCancelEdit: () => void;
    onSaveSupplier: () => void;
    onUpdateFormField: (field: keyof SupplierFormState, value: string) => void;
}

const SupplierFormCard = ({
    editingSupplier,
    form,
    isSubmitting,
    onCancelEdit,
    onSaveSupplier,
    onUpdateFormField,
}: SupplierFormCardProps) => {
    const saveButtonLabel = (() => {
        if (isSubmitting) {
            return "Saving...";
        }
        if (editingSupplier) {
            return "Save Changes";
        }
        return "Create Supplier";
    })();

    return (
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
                                onUpdateFormField(
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
                            onUpdateFormField("name", event.target.value)
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
                            onUpdateFormField(
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
                            onUpdateFormField("email", event.target.value)
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
                            onUpdateFormField("phone", event.target.value)
                        }
                        value={form.phone}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="supplier-payment">Payment Terms</Label>
                    <Input
                        id="supplier-payment"
                        onChange={(event) =>
                            onUpdateFormField(
                                "paymentTerms",
                                event.target.value
                            )
                        }
                        placeholder="Net 30"
                        value={form.paymentTerms}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="supplier-tax-id">Tax ID</Label>
                    <Input
                        id="supplier-tax-id"
                        onChange={(event) =>
                            onUpdateFormField("taxId", event.target.value)
                        }
                        placeholder="TIN/VAT number"
                        value={form.taxId}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="supplier-country">Country</Label>
                    <Input
                        id="supplier-country"
                        onChange={(event) =>
                            onUpdateFormField("country", event.target.value)
                        }
                        placeholder="Country"
                        value={form.country}
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="supplier-city">City</Label>
                    <Input
                        id="supplier-city"
                        onChange={(event) =>
                            onUpdateFormField("city", event.target.value)
                        }
                        placeholder="City / Town"
                        value={form.city}
                    />
                </div>
                <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="supplier-address">Address</Label>
                    <Input
                        id="supplier-address"
                        onChange={(event) =>
                            onUpdateFormField("address", event.target.value)
                        }
                        placeholder="Street / Building / Box"
                        value={form.address}
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
                        onClick={onSaveSupplier}
                    >
                        {saveButtonLabel}
                    </Button>
                    {editingSupplier ? (
                        <Button onClick={onCancelEdit} variant="outline">
                            Cancel Edit
                        </Button>
                    ) : null}
                </div>
            </CardContent>
        </Card>
    );
};

interface SupplierListCardProps {
    isRowBusyId: string | null;
    onDeleteSupplier: (supplier: SupplierRecord) => void;
    onEditSupplier: (supplier: SupplierRecord) => void;
    onRecordsViewChange: (recordsView: "live" | "archived") => void;
    onToggleSupplierActive: (supplier: SupplierRecord) => void;
    pendingDeleteSupplierId: string | null;
    recordsView: "live" | "archived";
    suppliers: SupplierRecord[];
}

const SupplierListCard = ({
    isRowBusyId,
    onDeleteSupplier,
    onEditSupplier,
    onRecordsViewChange,
    onToggleSupplierActive,
    pendingDeleteSupplierId,
    recordsView,
    suppliers,
}: SupplierListCardProps) => {
    return (
        <Card>
            <CardHeader>
                <div className="flex items-end justify-between gap-3">
                    <CardTitle>Supplier List</CardTitle>
                    <div className="w-full max-w-48 space-y-2">
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
                                            nativeButton={false}
                                            render={
                                                <Link
                                                    params={{
                                                        supplierId: supplier.id,
                                                    }}
                                                    to="/suppliers/$supplierId"
                                                />
                                            }
                                            size="sm"
                                            variant="outline"
                                        >
                                            View
                                        </Button>
                                        {recordsView === "live" ? (
                                            <>
                                                <Button
                                                    disabled={
                                                        isRowBusyId ===
                                                        supplier.id
                                                    }
                                                    onClick={() =>
                                                        onEditSupplier(supplier)
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Edit
                                                </Button>
                                                <Button
                                                    disabled={
                                                        isRowBusyId ===
                                                        supplier.id
                                                    }
                                                    onClick={() =>
                                                        onToggleSupplierActive(
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
                                                <Button
                                                    disabled={
                                                        isRowBusyId ===
                                                        supplier.id
                                                    }
                                                    onClick={() =>
                                                        onDeleteSupplier(
                                                            supplier
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    {pendingDeleteSupplierId ===
                                                    supplier.id
                                                        ? "Confirm Delete"
                                                        : "Delete"}
                                                </Button>
                                            </>
                                        ) : null}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export const Route = createFileRoute("/_dashboard/suppliers")({
    component: SuppliersPage,
    errorComponent: SuppliersRouteError,
    loader: async () => {
        const [archivedSuppliers, liveSuppliers] = await Promise.all([
            getSuppliers({
                data: { archivedOnly: true, includeInactive: true },
            }),
            getSuppliers({
                data: { includeInactive: true },
            }),
        ]);
        return {
            archivedSuppliers,
            liveSuppliers,
        };
    },
    pendingComponent: SuppliersRoutePending,
});

function SuppliersRoutePending() {
    return (
        <RoutePendingFallback
            subtitle="Loading suppliers, contacts, and payment terms."
            title="Loading Suppliers"
        />
    );
}

function SuppliersRouteError({
    error,
    reset,
}: {
    error: unknown;
    reset: () => void;
}) {
    return (
        <RouteErrorFallback
            error={error}
            reset={reset}
            title="Suppliers failed to load"
            to="/"
        />
    );
}

function SuppliersPage() {
    const location = useLocation();
    const router = useRouter();
    const { archivedSuppliers, liveSuppliers } = Route.useLoaderData();
    const [state, dispatch] = useReducer(suppliersPageReducer, {
        editingSupplierId: null,
        form: emptySupplierForm,
        isRowBusyId: null,
        isSubmitting: false,
        pendingDeleteSupplierId: null,
        recordsView: "live",
    });
    const {
        editingSupplierId,
        form,
        isRowBusyId,
        isSubmitting,
        pendingDeleteSupplierId,
        recordsView,
    } = state;
    const suppliers =
        recordsView === "archived" ? archivedSuppliers : liveSuppliers;
    const patchState = (patch: Partial<SuppliersPageState>) => {
        dispatch({
            patch,
            type: "patch",
        });
    };

    const editingSupplier = useMemo(
        () => suppliers.find((supplier) => supplier.id === editingSupplierId),
        [editingSupplierId, suppliers]
    );

    const updateFormField = (
        field: keyof SupplierFormState,
        value: string
    ): void => {
        dispatch({
            field,
            type: "patchForm",
            value,
        });
    };

    const loadSupplierIntoForm = (supplier: SupplierRecord): void => {
        patchState({
            editingSupplierId: supplier.id,
            form: {
                address: supplier.address ?? "",
                city: supplier.city ?? "",
                code: supplier.code,
                contactPerson: supplier.contactPerson ?? "",
                country: supplier.country ?? "",
                email: supplier.email ?? "",
                name: supplier.name,
                paymentTerms: supplier.paymentTerms ?? "",
                phone: supplier.phone ?? "",
                taxId: supplier.taxId ?? "",
            },
        });
    };

    const resetForm = (): void => {
        patchState({
            editingSupplierId: null,
            form: emptySupplierForm,
        });
    };

    const refresh = async (): Promise<void> => {
        await router.invalidate();
    };

    const createSupplierInput = () => ({
        address: toOptionalValue(form.address),
        city: toOptionalValue(form.city),
        code: form.code.trim().toUpperCase(),
        contactPerson: toOptionalValue(form.contactPerson),
        country: toOptionalValue(form.country),
        email: toOptionalValue(form.email),
        isActive: true,
        name: form.name.trim(),
        paymentTerms: toOptionalValue(form.paymentTerms),
        phone: toOptionalValue(form.phone),
        taxId: toOptionalValue(form.taxId),
    });

    const updateSupplierInput = (supplierId: string) => ({
        address: toOptionalValue(form.address),
        city: toOptionalValue(form.city),
        contactPerson: toOptionalValue(form.contactPerson),
        country: toOptionalValue(form.country),
        email: toOptionalValue(form.email),
        name: form.name.trim(),
        paymentTerms: toOptionalValue(form.paymentTerms),
        phone: toOptionalValue(form.phone),
        supplierId,
        taxId: toOptionalValue(form.taxId),
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
            patchState({ isSubmitting: true });
            if (editingSupplierId) {
                await saveExistingSupplier(editingSupplierId);
            } else {
                await createNewSupplier();
            }
            resetForm();
            await refresh();
            patchState({ isSubmitting: false });
        } catch (error) {
            patchState({ isSubmitting: false });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to save supplier."
            );
        }
    };

    const handleToggleSupplierActive = async (supplier: SupplierRecord) => {
        const successMessage = supplier.isActive
            ? "Supplier deactivated."
            : "Supplier activated.";

        try {
            patchState({ isRowBusyId: supplier.id });
            await setSupplierActive({
                data: {
                    isActive: !supplier.isActive,
                    supplierId: supplier.id,
                },
            });
            toast.success(successMessage);
            await refresh();
            patchState({ isRowBusyId: null });
        } catch (error) {
            patchState({ isRowBusyId: null });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update supplier status."
            );
        }
    };

    const handleDeleteSupplier = async (supplier: SupplierRecord) => {
        if (pendingDeleteSupplierId !== supplier.id) {
            patchState({ pendingDeleteSupplierId: supplier.id });
            return;
        }

        try {
            patchState({ isRowBusyId: supplier.id });
            await deleteSupplier({
                data: { supplierId: supplier.id },
            });
            toast.success("Supplier deleted.");
            patchState({ pendingDeleteSupplierId: null });
            if (editingSupplierId === supplier.id) {
                resetForm();
            }
            await refresh();
            patchState({ isRowBusyId: null });
        } catch (error) {
            patchState({ isRowBusyId: null });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete supplier."
            );
        }
    };

    if (location.pathname !== "/suppliers") {
        return <Outlet />;
    }

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Suppliers</h1>
                <p className="text-muted-foreground text-sm">
                    Manage suppliers, including profile updates, activation
                    status, and deletion controls.
                </p>
            </div>

            {recordsView === "live" ? (
                <SupplierFormCard
                    editingSupplier={editingSupplier}
                    form={form}
                    isSubmitting={isSubmitting}
                    onCancelEdit={resetForm}
                    onSaveSupplier={() => {
                        handleSaveSupplier().catch(() => undefined);
                    }}
                    onUpdateFormField={updateFormField}
                />
            ) : null}

            <SupplierListCard
                isRowBusyId={isRowBusyId}
                onDeleteSupplier={(supplier) => {
                    handleDeleteSupplier(supplier).catch(() => undefined);
                }}
                onEditSupplier={loadSupplierIntoForm}
                onRecordsViewChange={(nextView) => {
                    patchState({
                        editingSupplierId: null,
                        form: emptySupplierForm,
                        pendingDeleteSupplierId: null,
                        recordsView: nextView,
                    });
                }}
                onToggleSupplierActive={(supplier) => {
                    handleToggleSupplierActive(supplier).catch(() => undefined);
                }}
                pendingDeleteSupplierId={pendingDeleteSupplierId}
                recordsView={recordsView}
                suppliers={suppliers}
            />
        </section>
    );
}
