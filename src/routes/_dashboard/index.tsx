import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
    ActivityIcon,
    AlertTriangleIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    BoxesIcon,
    CalendarClockIcon,
    CheckCircle2Icon,
    Clock3Icon,
    DollarSignIcon,
    PackageIcon,
    ShoppingCartIcon,
    TruckIcon,
} from "lucide-react";
import { lazy, type ReactNode, Suspense } from "react";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getDashboardMetrics } from "@/features/reports/get-dashboard-metrics";
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

const dashboardMetricsQueryOptions = queryOptions({
    queryFn: () => getDashboardMetrics(),
    queryKey: ["dashboard-home-metrics"],
    staleTime: 5 * 60 * 1000,
});

type DashboardMetrics = Awaited<ReturnType<typeof getDashboardMetrics>>;

interface QueueSlice {
    key: string;
    label: string;
    value: number;
}

interface TrendPoint {
    dateLabel: string;
    valueMajor: number;
}

const DashboardChartsSection = lazy(() =>
    import("@/components/features/dashboard/dashboard-charts").then(
        (module) => ({
            default: module.DashboardChartsSection,
        })
    )
);

export const Route = createFileRoute("/_dashboard/")({
    component: HomePage,
    loader: async ({ context }) => {
        const [financialSettings, metrics] = await Promise.all([
            getFinancialSettings(),
            context.queryClient.ensureQueryData(dashboardMetricsQueryOptions),
        ]);

        return {
            financialSettings,
            metrics,
        };
    },
});

function HomePage() {
    const { financialSettings, metrics: initialMetrics } =
        Route.useLoaderData();
    const { currencyCode } = financialSettings;
    const { data: metrics, dataUpdatedAt } = useSuspenseQuery({
        ...dashboardMetricsQueryOptions,
        initialData: initialMetrics,
    });

    const latestTrend = metrics.inventoryTrend.at(-1);
    const previousTrend =
        metrics.inventoryTrend.length > 1
            ? metrics.inventoryTrend.at(metrics.inventoryTrend.length - 2)
            : null;
    const stockValueDeltaMinor = latestTrend
        ? latestTrend.totalValueMinor - (previousTrend?.totalValueMinor ?? 0)
        : 0;

    const trendData: TrendPoint[] = metrics.inventoryTrend.map((item) => ({
        dateLabel: new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        }).format(new Date(item.date)),
        valueMajor: item.totalValueMinor / 100,
    }));

    const queueSlices: QueueSlice[] = [
        {
            key: "pendingPurchaseOrders",
            label: "Pending Purchases",
            value: metrics.pendingPurchaseOrders,
        },
        {
            key: "pendingSalesOrders",
            label: "Pending Sales",
            value: metrics.pendingSalesOrders,
        },
        {
            key: "lowStockAlerts",
            label: "Low Stock",
            value: metrics.lowStockAlerts,
        },
        {
            key: "expiringIn30Days",
            label: "Expiring in 30d",
            value: metrics.expiringIn30Days,
        },
    ];

    const queueTotal = queueSlices.reduce((sum, item) => sum + item.value, 0);
    const lastUpdatedAt = new Date(dataUpdatedAt)
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");

    return (
        <section className="space-y-6 pb-2">
            <HeroSection
                lastUpdatedAt={lastUpdatedAt}
                queueTotal={queueTotal}
                recentMovements={metrics.recentMovementsLast7Days}
            />

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <KpiCard
                    accentColor="var(--chart-1)"
                    icon={<DollarSignIcon className="h-4 w-4" />}
                    label="Stock Value"
                    tone={toDeltaTone(stockValueDeltaMinor)}
                    trend={
                        stockValueDeltaMinor === 0
                            ? "No change from last snapshot"
                            : `${toDeltaSign(stockValueDeltaMinor)}${formatCurrencyFromMinorUnits(
                                  Math.abs(stockValueDeltaMinor),
                                  currencyCode
                              )} vs last snapshot`
                    }
                    value={formatCurrencyFromMinorUnits(
                        metrics.totalStockValueMinor,
                        currencyCode
                    )}
                />
                <KpiCard
                    accentColor="var(--chart-2)"
                    icon={<BoxesIcon className="h-4 w-4" />}
                    label="Units In Stock"
                    tone="neutral"
                    trend={`${Intl.NumberFormat().format(metrics.recentMovementsLast7Days)} movements in 7 days`}
                    value={Intl.NumberFormat().format(
                        metrics.totalUnitsInStock
                    )}
                />
                <KpiCard
                    accentColor="var(--chart-3)"
                    icon={<TruckIcon className="h-4 w-4" />}
                    label="Pending Purchase Orders"
                    tone="neutral"
                    trend="Inbound workload"
                    value={String(metrics.pendingPurchaseOrders)}
                />
                <KpiCard
                    accentColor="var(--chart-4)"
                    icon={<ShoppingCartIcon className="h-4 w-4" />}
                    label="Pending Sales Orders"
                    tone="neutral"
                    trend="Outbound workload"
                    value={String(metrics.pendingSalesOrders)}
                />
            </div>

            <Suspense fallback={<DashboardChartsFallback />}>
                <DashboardChartsSection
                    currencyCode={currencyCode}
                    queueSlices={queueSlices}
                    queueTotal={queueTotal}
                    stockValueDeltaMinor={stockValueDeltaMinor}
                    trendData={trendData}
                />
            </Suspense>

            <div className="grid gap-5 lg:grid-cols-3">
                <AlertsCard metrics={metrics} />
                <OperationsCard metrics={metrics} />
                <QuickActionsCard />
            </div>
        </section>
    );
}

function DashboardChartsFallback() {
    return (
        <div className="grid gap-5 xl:grid-cols-3">
            <Card className="xl:col-span-2">
                <CardHeader>
                    <Skeleton className="h-5 w-52" />
                </CardHeader>
                <CardContent>
                    <Skeleton className="h-72 w-full" />
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <Skeleton className="h-5 w-36" />
                </CardHeader>
                <CardContent className="space-y-3">
                    <Skeleton className="h-52 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                </CardContent>
            </Card>
        </div>
    );
}

function HeroSection({
    lastUpdatedAt,
    queueTotal,
    recentMovements,
}: {
    lastUpdatedAt: string;
    queueTotal: number;
    recentMovements: number;
}) {
    return (
        <header className="rounded-xl border border-border/70 bg-linear-to-br from-card via-card to-primary/8 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-5">
                <div className="space-y-2">
                    <h1 className="font-semibold text-2xl">
                        Operations Dashboard
                    </h1>
                    <p className="max-w-2xl text-foreground/80 text-sm">
                        Monitor inventory valuation, queue pressure, and order
                        execution performance from a single view.
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                        <Badge variant="outline">
                            <Clock3Icon className="mr-1 h-3.5 w-3.5" />
                            Last refresh: {lastUpdatedAt} UTC
                        </Badge>
                        <Badge variant="secondary">
                            <CalendarClockIcon className="mr-1 h-3.5 w-3.5" />5
                            minute cache window
                        </Badge>
                    </div>
                </div>
                <div className="grid min-w-56 gap-2 rounded-lg border border-border/70 bg-background/60 p-3 text-sm">
                    <div className="flex items-center justify-between">
                        <span className="text-foreground/80">Queue items</span>
                        <span className="font-semibold">{queueTotal}</span>
                    </div>
                    <div className="flex items-center justify-between">
                        <span className="text-foreground/80">
                            Movements (7d)
                        </span>
                        <span className="font-semibold">{recentMovements}</span>
                    </div>
                </div>
            </div>
        </header>
    );
}

function KpiCard({
    accentColor,
    icon,
    label,
    tone,
    trend,
    value,
}: {
    accentColor: string;
    icon: ReactNode;
    label: string;
    tone: "negative" | "neutral" | "positive";
    trend: string;
    value: string;
}) {
    return (
        <Card className="relative overflow-hidden border border-border/70 bg-linear-to-br from-card to-muted/30 shadow-sm">
            <div
                aria-hidden
                className="absolute inset-x-0 top-0 h-1"
                style={{ backgroundColor: accentColor }}
            />
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span>{label}</span>
                    <span
                        className="rounded-md border border-border/70 bg-background/80 p-1.5"
                        style={{ color: accentColor }}
                    >
                        {icon}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
                <p className="font-semibold text-2xl">{value}</p>
                <p
                    className={`inline-flex items-center gap-1 text-xs ${toToneClassName(tone)}`}
                >
                    <TrendIcon className="h-3.5 w-3.5" tone={tone} />
                    {trend}
                </p>
            </CardContent>
        </Card>
    );
}

function AlertsCard({ metrics }: { metrics: DashboardMetrics }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-chart-4" />
                    Attention Needed
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <AlertRow
                    label="Low Stock Alerts"
                    severity={toAlertSeverity(metrics.lowStockAlerts)}
                    value={metrics.lowStockAlerts}
                />
                <AlertRow
                    label="Expiring in 30 Days"
                    severity={toAlertSeverity(metrics.expiringIn30Days)}
                    value={metrics.expiringIn30Days}
                />
                <AlertRow
                    label="Recent Movements (7d)"
                    severity="healthy"
                    value={metrics.recentMovementsLast7Days}
                />
            </CardContent>
        </Card>
    );
}

function OperationsCard({ metrics }: { metrics: DashboardMetrics }) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <CalendarClockIcon className="h-4 w-4 text-chart-1" />
                    Operational Queue
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <QueueRow
                    description="Awaiting supplier response or receipt posting."
                    href="/purchase-orders"
                    label="Purchase Orders"
                    value={metrics.pendingPurchaseOrders}
                />
                <QueueRow
                    description="Awaiting pick, ship, or fulfillment."
                    href="/sales-orders"
                    label="Sales Orders"
                    value={metrics.pendingSalesOrders}
                />
            </CardContent>
        </Card>
    );
}

function QuickActionsCard() {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="h-4 w-4 text-chart-3" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                <ActionButton
                    icon={<BoxesIcon className="h-4 w-4" />}
                    label="Open Stock Operations"
                    to="/stock"
                />
                <ActionButton
                    icon={<ActivityIcon className="h-4 w-4" />}
                    label="Open Reports"
                    to="/reports"
                />
                <ActionButton
                    icon={<TruckIcon className="h-4 w-4" />}
                    label="Go to Purchase Orders"
                    to="/purchase-orders"
                />
                <ActionButton
                    icon={<ShoppingCartIcon className="h-4 w-4" />}
                    label="Go to Sales Orders"
                    to="/sales-orders"
                />
            </CardContent>
        </Card>
    );
}

function ActionButton({
    icon,
    label,
    to,
}: {
    icon: ReactNode;
    label: string;
    to: string;
}) {
    return (
        <Button
            className="justify-start gap-2"
            nativeButton={false}
            render={<Link to={to} />}
            variant="outline"
        >
            {icon}
            {label}
        </Button>
    );
}

function QueueRow({
    description,
    href,
    label,
    value,
}: {
    description: string;
    href: string;
    label: string;
    value: number;
}) {
    return (
        <div className="space-y-2 rounded-md border border-border/70 bg-background/45 p-3">
            <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{label}</p>
                <Badge variant="outline">{value}</Badge>
            </div>
            <p className="text-foreground/75 text-xs">{description}</p>
            <Button
                className="w-full justify-start"
                nativeButton={false}
                render={<Link to={href} />}
                size="sm"
                variant="outline"
            >
                Open {label}
            </Button>
        </div>
    );
}

function AlertRow({
    label,
    severity,
    value,
}: {
    label: string;
    severity: "critical" | "healthy" | "warning";
    value: number;
}) {
    const variant = toBadgeVariant(severity);
    let icon = <CheckCircle2Icon className="h-4 w-4 text-chart-3" />;
    if (severity === "critical") {
        icon = <AlertTriangleIcon className="h-4 w-4 text-destructive" />;
    } else if (severity === "warning") {
        icon = <Clock3Icon className="h-4 w-4 text-chart-4" />;
    }

    return (
        <div className="flex items-center justify-between gap-3 rounded-md border border-border/70 bg-background/45 p-2.5">
            <div className="flex items-center gap-2">
                {icon}
                <span className="text-sm">{label}</span>
            </div>
            <Badge variant={variant}>{value}</Badge>
        </div>
    );
}

const toAlertSeverity = (value: number): "critical" | "healthy" | "warning" => {
    if (value >= 25) {
        return "critical";
    }
    if (value >= 10) {
        return "warning";
    }
    return "healthy";
};

const toBadgeVariant = (
    severity: "critical" | "healthy" | "warning"
): "destructive" | "outline" | "secondary" => {
    if (severity === "critical") {
        return "destructive";
    }
    if (severity === "warning") {
        return "outline";
    }
    return "secondary";
};

const toDeltaTone = (value: number): "negative" | "neutral" | "positive" => {
    if (value > 0) {
        return "positive";
    }
    if (value < 0) {
        return "negative";
    }
    return "neutral";
};

const toDeltaSign = (value: number): string => {
    if (value > 0) {
        return "+";
    }
    if (value < 0) {
        return "-";
    }
    return "";
};

const toToneClassName = (tone: "negative" | "neutral" | "positive"): string => {
    if (tone === "positive") {
        return "text-emerald-500";
    }
    if (tone === "negative") {
        return "text-red-500";
    }
    return "text-foreground/75";
};

function TrendIcon({
    className,
    tone,
}: {
    className?: string;
    tone: "negative" | "neutral" | "positive";
}) {
    if (tone === "positive") {
        return <ArrowUpIcon className={className} />;
    }
    if (tone === "negative") {
        return <ArrowDownIcon className={className} />;
    }
    return <ArrowRightIcon className={className} />;
}
