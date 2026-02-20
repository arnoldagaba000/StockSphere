import { createFileRoute } from "@tanstack/react-router";
import { useReducer, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { exportSystemSettings } from "@/features/settings/export-system-settings";
import { getSystemSettings } from "@/features/settings/get-system-settings";
import { importSystemSettings } from "@/features/settings/import-system-settings";
import { upsertSystemSettings } from "@/features/settings/upsert-system-settings";

type SystemSettingsState = Awaited<ReturnType<typeof getSystemSettings>>;

const systemSettingsReducer = (
    state: SystemSettingsState,
    patch: Partial<SystemSettingsState>
): SystemSettingsState => ({
    ...state,
    ...patch,
});

export const Route = createFileRoute("/_dashboard/settings/system")({
    component: SystemSettingsPage,
    loader: async () => await getSystemSettings(),
});

function SystemSettingsPage() {
    const initialSettings = Route.useLoaderData();
    const [state, setState] = useReducer(
        systemSettingsReducer,
        initialSettings
    );
    const [importPayload, setImportPayload] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [isExporting, setIsExporting] = useState(false);

    const handleSave = async () => {
        setIsSaving(true);
        await upsertSystemSettings({
            data: state,
        })
            .then((savedSettings) => {
                setState(savedSettings);
                toast.success("System settings saved.");
            })
            .catch((error: unknown) => {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Failed to save system settings."
                );
            });
        setIsSaving(false);
    };

    const triggerBrowserDownload = (filename: string, content: string) => {
        const blob = new Blob([content], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = url;
        anchor.download = filename;
        anchor.click();
        URL.revokeObjectURL(url);
    };

    const handleExport = async () => {
        setIsExporting(true);
        await exportSystemSettings()
            .then((result) => {
                triggerBrowserDownload(result.filename, result.json);
                toast.success("System settings exported.");
            })
            .catch((error: unknown) => {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Failed to export system settings."
                );
            });
        setIsExporting(false);
    };

    const handleImport = async () => {
        let parsedPayload: unknown;
        try {
            parsedPayload = JSON.parse(importPayload);
        } catch {
            toast.error("Import payload is not valid JSON.");
            return;
        }

        setIsImporting(true);
        await importSystemSettings({
            data: parsedPayload as SystemSettingsState,
        })
            .then((imported) => {
                setState(imported);
                setImportPayload("");
                toast.success("System settings imported.");
            })
            .catch((error: unknown) => {
                toast.error(
                    error instanceof Error
                        ? error.message
                        : "Failed to import system settings."
                );
            });
        setIsImporting(false);
    };

    return (
        <section className="space-y-4">
            <div className="space-y-1">
                <h2 className="font-medium text-lg">System Configuration</h2>
                <p className="text-muted-foreground text-sm">
                    Configure company profile, defaults, numbering, and
                    operational policies.
                </p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Company</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field
                            id="settings-company-name"
                            label="Company Name"
                            onValueChange={(value) =>
                                setState({
                                    company: { ...state.company, name: value },
                                })
                            }
                            value={state.company.name}
                        />
                        <Field
                            id="settings-company-address"
                            label="Address"
                            onValueChange={(value) =>
                                setState({
                                    company: {
                                        ...state.company,
                                        address: value,
                                    },
                                })
                            }
                            value={state.company.address}
                        />
                        <Field
                            id="settings-company-email"
                            label="Email"
                            onValueChange={(value) =>
                                setState({
                                    company: { ...state.company, email: value },
                                })
                            }
                            type="email"
                            value={state.company.email}
                        />
                        <Field
                            id="settings-company-phone"
                            label="Phone"
                            onValueChange={(value) =>
                                setState({
                                    company: { ...state.company, phone: value },
                                })
                            }
                            value={state.company.phone}
                        />
                        <Field
                            id="settings-company-logo-url"
                            label="Logo URL"
                            onValueChange={(value) =>
                                setState({
                                    company: {
                                        ...state.company,
                                        logoUrl: value,
                                    },
                                })
                            }
                            value={state.company.logoUrl}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Financial Defaults</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field
                            id="settings-currency-code"
                            label="Currency Code"
                            onValueChange={(value) =>
                                setState({
                                    financial: {
                                        ...state.financial,
                                        currencyCode: value.toUpperCase(),
                                    },
                                })
                            }
                            value={state.financial.currencyCode}
                        />
                        <Field
                            id="settings-tax-rate"
                            label="Default Tax Rate (%)"
                            onValueChange={(value) =>
                                setState({
                                    financial: {
                                        ...state.financial,
                                        defaultTaxRatePercent:
                                            Number(value) ||
                                            state.financial
                                                .defaultTaxRatePercent,
                                    },
                                })
                            }
                            type="number"
                            value={String(
                                state.financial.defaultTaxRatePercent
                            )}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Numbering Prefixes</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field
                            id="settings-so-prefix"
                            label="Sales Order"
                            onValueChange={(value) =>
                                setState({
                                    numbering: {
                                        ...state.numbering,
                                        salesOrderPrefix: value.toUpperCase(),
                                    },
                                })
                            }
                            value={state.numbering.salesOrderPrefix}
                        />
                        <Field
                            id="settings-po-prefix"
                            label="Purchase Order"
                            onValueChange={(value) =>
                                setState({
                                    numbering: {
                                        ...state.numbering,
                                        purchaseOrderPrefix:
                                            value.toUpperCase(),
                                    },
                                })
                            }
                            value={state.numbering.purchaseOrderPrefix}
                        />
                        <Field
                            id="settings-shipment-prefix"
                            label="Shipment"
                            onValueChange={(value) =>
                                setState({
                                    numbering: {
                                        ...state.numbering,
                                        shipmentPrefix: value.toUpperCase(),
                                    },
                                })
                            }
                            value={state.numbering.shipmentPrefix}
                        />
                        <Field
                            id="settings-grn-prefix"
                            label="Goods Receipt"
                            onValueChange={(value) =>
                                setState({
                                    numbering: {
                                        ...state.numbering,
                                        goodsReceiptPrefix: value.toUpperCase(),
                                    },
                                })
                            }
                            value={state.numbering.goodsReceiptPrefix}
                        />
                        <Field
                            id="settings-it-prefix"
                            label="Inventory Transaction"
                            onValueChange={(value) =>
                                setState({
                                    numbering: {
                                        ...state.numbering,
                                        inventoryTransactionPrefix:
                                            value.toUpperCase(),
                                    },
                                })
                            }
                            value={state.numbering.inventoryTransactionPrefix}
                        />
                        <Field
                            id="settings-movement-prefix"
                            label="Stock Movement"
                            onValueChange={(value) =>
                                setState({
                                    numbering: {
                                        ...state.numbering,
                                        stockMovementPrefix:
                                            value.toUpperCase(),
                                    },
                                })
                            }
                            value={state.numbering.stockMovementPrefix}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Inventory Policy</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <Field
                            id="settings-adjust-threshold"
                            label="Adjustment Approval Threshold"
                            onValueChange={(value) =>
                                setState({
                                    inventoryPolicy: {
                                        ...state.inventoryPolicy,
                                        adjustmentApprovalThreshold:
                                            Number(value) ||
                                            state.inventoryPolicy
                                                .adjustmentApprovalThreshold,
                                    },
                                })
                            }
                            type="number"
                            value={String(
                                state.inventoryPolicy
                                    .adjustmentApprovalThreshold
                            )}
                        />
                        <Field
                            id="settings-fiscal-month"
                            label="Fiscal Year Start Month (1-12)"
                            onValueChange={(value) =>
                                setState({
                                    inventoryPolicy: {
                                        ...state.inventoryPolicy,
                                        fiscalYearStartMonth:
                                            Number(value) ||
                                            state.inventoryPolicy
                                                .fiscalYearStartMonth,
                                    },
                                })
                            }
                            type="number"
                            value={String(
                                state.inventoryPolicy.fiscalYearStartMonth
                            )}
                        />

                        <div className="space-y-2 rounded-md border p-3">
                            <Label>Email Notifications</Label>

                            <ToggleField
                                checked={
                                    state.notifications.lowStockAlertsEnabled
                                }
                                label="Low stock alerts"
                                onCheckedChange={(checked) =>
                                    setState({
                                        notifications: {
                                            ...state.notifications,
                                            lowStockAlertsEnabled: checked,
                                        },
                                    })
                                }
                            />
                            <ToggleField
                                checked={
                                    state.notifications.expiryAlertsEnabled
                                }
                                label="Expiry alerts"
                                onCheckedChange={(checked) =>
                                    setState({
                                        notifications: {
                                            ...state.notifications,
                                            expiryAlertsEnabled: checked,
                                        },
                                    })
                                }
                            />
                            <ToggleField
                                checked={
                                    state.notifications.dailySummaryEnabled
                                }
                                label="Daily summary"
                                onCheckedChange={(checked) =>
                                    setState({
                                        notifications: {
                                            ...state.notifications,
                                            dailySummaryEnabled: checked,
                                        },
                                    })
                                }
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="xl:col-span-2">
                    <CardHeader>
                        <CardTitle>Backup & Restore</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                            <Button
                                disabled={isExporting}
                                onClick={() => {
                                    handleExport().catch(() => undefined);
                                }}
                                type="button"
                                variant="outline"
                            >
                                {isExporting
                                    ? "Exporting..."
                                    : "Export Settings JSON"}
                            </Button>
                        </div>
                        <div className="space-y-1">
                            <Label htmlFor="settings-import-json">
                                Import Settings JSON
                            </Label>
                            <Textarea
                                id="settings-import-json"
                                onChange={(event) =>
                                    setImportPayload(event.target.value)
                                }
                                placeholder="Paste exported settings JSON here..."
                                rows={8}
                                value={importPayload}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                disabled={
                                    isImporting ||
                                    importPayload.trim().length === 0
                                }
                                onClick={() => {
                                    handleImport().catch(() => undefined);
                                }}
                                type="button"
                            >
                                {isImporting
                                    ? "Importing..."
                                    : "Import and Apply"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>

            <div className="flex justify-end">
                <Button
                    disabled={isSaving}
                    onClick={() => {
                        handleSave().catch(() => undefined);
                    }}
                    type="button"
                >
                    {isSaving ? "Saving..." : "Save System Settings"}
                </Button>
            </div>
        </section>
    );
}

function Field({
    id,
    label,
    onValueChange,
    type = "text",
    value,
}: {
    id: string;
    label: string;
    onValueChange: (value: string) => void;
    type?: string;
    value: string;
}) {
    return (
        <div className="space-y-1">
            <Label htmlFor={id}>{label}</Label>
            <Input
                id={id}
                onChange={(event) => onValueChange(event.target.value)}
                type={type}
                value={value}
            />
        </div>
    );
}

function ToggleField({
    checked,
    label,
    onCheckedChange,
}: {
    checked: boolean;
    label: string;
    onCheckedChange: (checked: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <span className="text-sm">{label}</span>
            <Switch checked={checked} onCheckedChange={onCheckedChange} />
        </div>
    );
}
