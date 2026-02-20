import { createFileRoute } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createStockSnapshot } from "@/features/reports/create-stock-snapshot";
import { generateAgingReport } from "@/features/reports/generate-aging-report";
import { generateMovementReport } from "@/features/reports/generate-movement-report";
import { generateValuationReport } from "@/features/reports/generate-valuation-report";
import { getDashboardMetrics } from "@/features/reports/get-dashboard-metrics";

interface ReportsPageState {
    agingDeadStockValueMinor: number;
    csvPreview: string;
    dateFrom: string;
    dateTo: string;
    movementCount: number;
    valuationTotalMinor: number;
}

const getDefaultReportsState = (): ReportsPageState => {
    const now = new Date();
    const weekAgo = new Date(now);
    weekAgo.setDate(weekAgo.getDate() - 7);

    return {
        agingDeadStockValueMinor: 0,
        csvPreview: "",
        dateFrom: weekAgo.toISOString().slice(0, 10),
        dateTo: now.toISOString().slice(0, 10),
        movementCount: 0,
        valuationTotalMinor: 0,
    };
};

const reportsPageReducer = (
    state: ReportsPageState,
    action: Partial<ReportsPageState>
): ReportsPageState => ({
    ...state,
    ...action,
});

export const Route = createFileRoute("/_dashboard/reports")({
    component: ReportsPage,
    loader: async () => {
        const metrics = await getDashboardMetrics();
        return { metrics };
    },
});

function ReportsPage() {
    const { metrics } = Route.useLoaderData();

    const [state, setState] = useReducer(
        reportsPageReducer,
        undefined,
        getDefaultReportsState
    );

    const runCreateSnapshot = async () => {
        try {
            const result = await createStockSnapshot();
            toast.success(
                `Snapshot created (${result.recordsCreated} records).`
            );
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Action failed."
            );
        }
    };

    const runMovementReport = async () => {
        try {
            const result = await generateMovementReport({
                data: {
                    dateFrom: new Date(state.dateFrom),
                    dateTo: new Date(state.dateTo),
                    format: "json",
                },
            });
            setState({ movementCount: result.summary.totalMovements });
            toast.success("Movement report generated.");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Action failed."
            );
        }
    };

    const runValuationReport = async () => {
        try {
            const result = await generateValuationReport({
                data: {
                    format: "json",
                    includeZeroQuantity: false,
                },
            });
            setState({ valuationTotalMinor: result.summary.totalValueMinor });
            toast.success("Valuation report generated.");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Action failed."
            );
        }
    };

    const runAgingReport = async () => {
        try {
            const result = await generateAgingReport();
            setState({
                agingDeadStockValueMinor:
                    result.summary.totalDeadStockValueMinor,
            });
            toast.success("Aging report generated.");
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Action failed."
            );
        }
    };

    const runMovementCsv = async () => {
        try {
            const result = await generateMovementReport({
                data: {
                    dateFrom: new Date(state.dateFrom),
                    dateTo: new Date(state.dateTo),
                    format: "csv",
                },
            });
            if (result.format !== "csv") {
                toast.error("Unexpected response format.");
                return;
            }
            setState({ csvPreview: result.content.slice(0, 2000) });
            toast.success(`CSV generated: ${result.filename}`);
        } catch (error) {
            toast.error(
                error instanceof Error ? error.message : "Action failed."
            );
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Reports</h1>
                <p className="text-muted-foreground text-sm">
                    KPI dashboard, valuation, stock movement, aging, and
                    snapshot tools.
                </p>
            </div>

            <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
                <MetricCard
                    label="Units In Stock"
                    value={String(metrics.totalUnitsInStock)}
                />
                <MetricCard
                    label="Low Stock"
                    value={String(metrics.lowStockAlerts)}
                />
                <MetricCard
                    label="Pending PO"
                    value={String(metrics.pendingPurchaseOrders)}
                />
                <MetricCard
                    label="Pending SO"
                    value={String(metrics.pendingSalesOrders)}
                />
                <MetricCard
                    label="Recent Movements"
                    value={String(metrics.recentMovementsLast7Days)}
                />
                <MetricCard
                    label="Stock Value"
                    value={formatCurrencyFromMinorUnits(
                        metrics.totalStockValueMinor
                    )}
                />
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Report Actions</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2">
                        <Label htmlFor="date-from">Date From</Label>
                        <Input
                            id="date-from"
                            onChange={(event) =>
                                setState({ dateFrom: event.target.value })
                            }
                            type="date"
                            value={state.dateFrom}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="date-to">Date To</Label>
                        <Input
                            id="date-to"
                            onChange={(event) =>
                                setState({ dateTo: event.target.value })
                            }
                            type="date"
                            value={state.dateTo}
                        />
                    </div>
                    <div className="flex flex-wrap items-end gap-2">
                        <Button
                            onClick={runMovementReport}
                            type="button"
                            variant="outline"
                        >
                            Movement JSON
                        </Button>
                        <Button
                            onClick={runMovementCsv}
                            type="button"
                            variant="outline"
                        >
                            Movement CSV
                        </Button>
                        <Button
                            onClick={runValuationReport}
                            type="button"
                            variant="outline"
                        >
                            Valuation JSON
                        </Button>
                        <Button
                            onClick={runAgingReport}
                            type="button"
                            variant="outline"
                        >
                            Aging JSON
                        </Button>
                        <Button onClick={runCreateSnapshot} type="button">
                            Create Snapshot
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Latest Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                    <p>Movement rows: {state.movementCount}</p>
                    <p>
                        Valuation total:{" "}
                        {formatCurrencyFromMinorUnits(
                            state.valuationTotalMinor
                        )}
                    </p>
                    <p>
                        Dead stock value:{" "}
                        {formatCurrencyFromMinorUnits(
                            state.agingDeadStockValueMinor
                        )}
                    </p>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>CSV Preview</CardTitle>
                </CardHeader>
                <CardContent>
                    <Textarea readOnly rows={12} value={state.csvPreview} />
                </CardContent>
            </Card>
        </section>
    );
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <Card>
            <CardContent className="p-4">
                <p className="text-muted-foreground text-xs">{label}</p>
                <p className="font-semibold text-xl">{value}</p>
            </CardContent>
        </Card>
    );
}
