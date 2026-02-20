import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
    ActivityIcon,
    AlertTriangleIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    Clock3Icon,
    DollarSignIcon,
    PackageIcon,
    ShoppingCartIcon,
    TruckIcon,
} from "lucide-react";
import {
    lazy,
    type ReactNode,
    Suspense,
    useEffect,
    useRef,
    useState,
} from "react";
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

const Area = lazy(async () => {
    const module = await import("recharts");
    return { default: module.Area };
});

const AreaChart = lazy(async () => {
    const module = await import("recharts");
    return { default: module.AreaChart };
});

const CartesianGrid = lazy(async () => {
    const module = await import("recharts");
    return { default: module.CartesianGrid };
});

const Cell = lazy(async () => {
    const module = await import("recharts");
    return { default: module.Cell };
});

const Pie = lazy(async () => {
    const module = await import("recharts");
    return { default: module.Pie };
});

const PieChart = lazy(async () => {
    const module = await import("recharts");
    return { default: module.PieChart };
});

const Tooltip = lazy(async () => {
    const module = await import("recharts");
    return { default: module.Tooltip };
});

const XAxis = lazy(async () => {
    const module = await import("recharts");
    return { default: module.XAxis };
});

const YAxis = lazy(async () => {
    const module = await import("recharts");
    return { default: module.YAxis };
});

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

    const stockValueDelta = latestTrend
        ? latestTrend.totalValueMinor - (previousTrend?.totalValueMinor ?? 0)
        : 0;
    const stockValueDeltaClassName = toDeltaTextClassName(stockValueDelta);
    const stockValueDeltaSign = toDeltaSign(stockValueDelta);

    const lowStockSeverity = toHealthSeverity(metrics.lowStockAlerts);
    const expiringSeverity = toHealthSeverity(metrics.expiringIn30Days);
    const trendChart = useElementSize<HTMLDivElement>();
    const queueChart = useElementSize<HTMLDivElement>();
    const trendData = metrics.inventoryTrend.map((item) => ({
        dateLabel: new Intl.DateTimeFormat("en-US", {
            day: "numeric",
            month: "short",
            timeZone: "UTC",
        }).format(new Date(item.date)),
        valueMajor: item.totalValueMinor / 100,
    }));
    const queueDistribution = [
        {
            colorClass: "fill-amber-500",
            key: "pendingPurchaseOrders",
            label: "Pending Purchase Orders",
            value: metrics.pendingPurchaseOrders,
        },
        {
            colorClass: "fill-indigo-500",
            key: "pendingSalesOrders",
            label: "Pending Sales Orders",
            value: metrics.pendingSalesOrders,
        },
        {
            colorClass: "fill-rose-500",
            key: "lowStockAlerts",
            label: "Low Stock Alerts",
            value: metrics.lowStockAlerts,
        },
        {
            colorClass: "fill-orange-500",
            key: "expiringIn30Days",
            label: "Expiring in 30 Days",
            value: metrics.expiringIn30Days,
        },
    ] as const;
    const queueTotal = queueDistribution.reduce(
        (total, item) => total + item.value,
        0
    );
    const lastUpdatedAt = new Date(dataUpdatedAt)
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");

    return (
        <section className="space-y-6">
            <header className="space-y-3">
                <div className="rounded-xl border bg-linear-to-br from-background to-muted/40 p-5">
                    <h1 className="font-semibold text-2xl">Dashboard</h1>
                    <p className="mt-1 text-muted-foreground text-sm">
                        Real-time operating snapshot for inventory, order flow,
                        and stock health.
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline">
                            <Clock3Icon className="mr-1 h-3.5 w-3.5" />
                            Last refresh: {lastUpdatedAt} UTC
                        </Badge>
                        <Badge variant="secondary">
                            <ActivityIcon className="mr-1 h-3.5 w-3.5" />
                            Snapshot: live cache (5 min)
                        </Badge>
                    </div>
                </div>
            </header>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    icon={<DollarSignIcon className="h-4 w-4" />}
                    label="Stock Value"
                    trendLabel={
                        stockValueDelta === 0
                            ? "No change from previous snapshot"
                            : `${stockValueDelta > 0 ? "+" : "-"}${formatCurrencyFromMinorUnits(
                                  Math.abs(stockValueDelta),
                                  currencyCode
                              )} vs previous snapshot`
                    }
                    trendTone={toDeltaTone(stockValueDelta)}
                    value={formatCurrencyFromMinorUnits(
                        metrics.totalStockValueMinor,
                        currencyCode
                    )}
                />
                <MetricCard
                    icon={<PackageIcon className="h-4 w-4" />}
                    label="Units In Stock"
                    trendLabel={`${Intl.NumberFormat().format(
                        metrics.recentMovementsLast7Days
                    )} movements in last 7 days`}
                    value={Intl.NumberFormat().format(
                        metrics.totalUnitsInStock
                    )}
                />
                <MetricCard
                    icon={<TruckIcon className="h-4 w-4" />}
                    label="Pending Purchase Orders"
                    trendLabel="Inbound supply queue"
                    value={String(metrics.pendingPurchaseOrders)}
                />
                <MetricCard
                    icon={<ShoppingCartIcon className="h-4 w-4" />}
                    label="Pending Sales Orders"
                    trendLabel="Outbound fulfillment queue"
                    value={String(metrics.pendingSalesOrders)}
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                            Inventory Value Trend (30 days)
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {trendData.length > 0 ? (
                            <div
                                className="h-72 w-full min-w-0 rounded-md border bg-muted/20 p-2"
                                ref={trendChart.ref}
                            >
                                {trendChart.size.height > 0 &&
                                trendChart.size.width > 0 ? (
                                    <Suspense fallback={<ChartLoadingState />}>
                                        <AreaChart
                                            data={trendData}
                                            height={trendChart.size.height}
                                            width={trendChart.size.width}
                                        >
                                            <defs>
                                                <linearGradient
                                                    id="inventoryValueGradient"
                                                    x1="0"
                                                    x2="0"
                                                    y1="0"
                                                    y2="1"
                                                >
                                                    <stop
                                                        offset="5%"
                                                        stopColor="hsl(var(--primary))"
                                                        stopOpacity={0.3}
                                                    />
                                                    <stop
                                                        offset="95%"
                                                        stopColor="hsl(var(--primary))"
                                                        stopOpacity={0}
                                                    />
                                                </linearGradient>
                                            </defs>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="dateLabel"
                                                tickMargin={8}
                                            />
                                            <YAxis
                                                tickFormatter={(value) =>
                                                    Intl.NumberFormat("en-US", {
                                                        notation: "compact",
                                                    }).format(value)
                                                }
                                            />
                                            <Tooltip
                                                formatter={(value) =>
                                                    formatCurrencyFromMinorUnits(
                                                        Math.round(
                                                            Number(value) * 100
                                                        ),
                                                        currencyCode
                                                    )
                                                }
                                            />
                                            <Area
                                                dataKey="valueMajor"
                                                fill="url(#inventoryValueGradient)"
                                                stroke="hsl(var(--primary))"
                                                strokeWidth={2}
                                                type="monotone"
                                            />
                                        </AreaChart>
                                    </Suspense>
                                ) : null}
                            </div>
                        ) : (
                            <EmptyChartMessage />
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                            <span className="text-muted-foreground">
                                Latest value:{" "}
                                {formatCurrencyFromMinorUnits(
                                    latestTrend?.totalValueMinor ?? 0,
                                    currencyCode
                                )}
                            </span>
                            <span className={stockValueDeltaClassName}>
                                <TrendIcon
                                    className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                                    tone={toDeltaTone(stockValueDelta)}
                                />
                                {stockValueDeltaSign}
                                {formatCurrencyFromMinorUnits(
                                    Math.abs(stockValueDelta),
                                    currencyCode
                                )}{" "}
                                vs previous snapshot
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
                            Queue Distribution
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div
                            className="h-52 w-full min-w-0"
                            ref={queueChart.ref}
                        >
                            {queueChart.size.height > 0 &&
                            queueChart.size.width > 0 ? (
                                <Suspense fallback={<ChartLoadingState />}>
                                    <PieChart
                                        height={queueChart.size.height}
                                        width={queueChart.size.width}
                                    >
                                        <Pie
                                            cx="50%"
                                            cy="50%"
                                            data={queueDistribution}
                                            dataKey="value"
                                            innerRadius={48}
                                            nameKey="label"
                                            outerRadius={72}
                                        >
                                            {queueDistribution.map((entry) => (
                                                <Cell
                                                    className={entry.colorClass}
                                                    key={entry.key}
                                                />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </Suspense>
                            ) : null}
                        </div>
                        <div className="space-y-2">
                            {queueDistribution.map((item) => (
                                <div
                                    className="space-y-1 text-xs"
                                    key={item.key}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">
                                            {item.label}
                                        </span>
                                        <span className="font-medium">
                                            {item.value}
                                        </span>
                                    </div>
                                    <div className="h-1.5 rounded-full bg-muted">
                                        <div
                                            className={`h-full rounded-full ${item.colorClass.replace("fill-", "bg-")}`}
                                            style={{
                                                width: `${queueTotal === 0 ? 0 : Math.round((item.value / queueTotal) * 100)}%`,
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-muted-foreground text-xs">
                            Total active items in queue: {queueTotal}
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
                            Inventory Health
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-3">
                        <HealthRow
                            label="Low Stock Alerts"
                            severity={lowStockSeverity}
                            value={metrics.lowStockAlerts}
                        />
                        <HealthRow
                            label="Expiring in 30 Days"
                            severity={expiringSeverity}
                            value={metrics.expiringIn30Days}
                        />
                        <HealthRow
                            label="Recent Movements (7d)"
                            severity="healthy"
                            value={metrics.recentMovementsLast7Days}
                        />
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2">
                            <ActivityIcon className="h-4 w-4 text-muted-foreground" />
                            Quick Actions
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-3">
                        <Button
                            className="justify-start"
                            nativeButton={false}
                            render={<Link to="/stock" />}
                            variant="outline"
                        >
                            Open Stock Operations
                        </Button>
                        <Button
                            className="justify-start"
                            nativeButton={false}
                            render={<Link to="/reports" />}
                            variant="outline"
                        >
                            View Reports
                        </Button>
                        <Button
                            className="justify-start"
                            nativeButton={false}
                            render={<Link to="/settings/system" />}
                            variant="outline"
                        >
                            Configure System
                        </Button>
                        <Button
                            className="justify-start"
                            nativeButton={false}
                            render={<Link to="/profile" />}
                            variant="outline"
                        >
                            My Profile
                        </Button>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <Clock3Icon className="h-4 w-4 text-muted-foreground" />
                        Operational Queue
                    </CardTitle>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <QueueCard
                        description="Orders waiting supplier confirmation or receipt workflow."
                        href="/purchase-orders"
                        label="Purchase Orders"
                        value={metrics.pendingPurchaseOrders}
                    />
                    <QueueCard
                        description="Customer orders waiting picking, shipping, or fulfillment."
                        href="/sales-orders"
                        label="Sales Orders"
                        value={metrics.pendingSalesOrders}
                    />
                    <QueueCard
                        description="Items approaching or below their configured reorder point."
                        href="/stock"
                        label="Low Stock Items"
                        value={metrics.lowStockAlerts}
                    />
                    <QueueCard
                        description="Lots and batches with upcoming expiry within the next 30 days."
                        href="/reports"
                        label="Expiring Soon"
                        value={metrics.expiringIn30Days}
                    />
                </CardContent>
            </Card>
        </section>
    );
}

function MetricCard({
    icon,
    label,
    trendTone = "neutral",
    trendLabel,
    value,
}: {
    icon?: ReactNode;
    label: string;
    trendTone?: "negative" | "neutral" | "positive";
    trendLabel?: string;
    value: string;
}) {
    const trendToneClassName = toTrendToneClassName(trendTone);

    return (
        <Card className="border bg-linear-to-br from-background to-muted/30">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 font-medium text-sm">
                    <span>{label}</span>
                    {icon ? (
                        <span className="rounded-md border bg-background/70 p-1.5 text-muted-foreground">
                            {icon}
                        </span>
                    ) : null}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
                <p className="font-semibold text-xl">{value}</p>
                {trendLabel ? (
                    <p
                        className={`mt-1 inline-flex items-center gap-1 text-xs ${trendToneClassName}`}
                    >
                        <TrendIcon className="h-3.5 w-3.5" tone={trendTone} />
                        {trendLabel}
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

function HealthRow({
    label,
    severity,
    value,
}: {
    label: string;
    severity: "critical" | "healthy" | "warning";
    value: number;
}) {
    const badgeVariant = toBadgeVariant(severity);

    return (
        <div className="flex items-center justify-between gap-2 rounded-md border p-2">
            <span className="text-sm">{label}</span>
            <Badge variant={badgeVariant}>{value}</Badge>
        </div>
    );
}

const toHealthSeverity = (
    value: number
): "critical" | "healthy" | "warning" => {
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

const toTrendToneClassName = (
    trendTone: "negative" | "neutral" | "positive"
): string => {
    if (trendTone === "positive") {
        return "text-emerald-600";
    }
    if (trendTone === "negative") {
        return "text-red-600";
    }
    return "text-muted-foreground";
};

const toDeltaTextClassName = (value: number): string => {
    if (value > 0) {
        return "text-emerald-600";
    }
    if (value < 0) {
        return "text-red-600";
    }
    return "text-muted-foreground";
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

function QueueCard({
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
        <div className="space-y-3 rounded-md border p-4">
            <div className="flex items-center justify-between gap-2">
                <p className="font-medium text-sm">{label}</p>
                <Badge variant="outline">{value}</Badge>
            </div>
            <p className="text-muted-foreground text-xs">{description}</p>
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

function EmptyChartMessage() {
    return (
        <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
            Not enough trend data yet. Generate stock snapshots to populate this
            chart.
        </div>
    );
}

function ChartLoadingState() {
    return <Skeleton className="h-full w-full rounded-md" />;
}

const useElementSize = <TElement extends HTMLElement>() => {
    const ref = useRef<TElement | null>(null);
    const [size, setSize] = useState({
        height: 0,
        width: 0,
    });

    useEffect(() => {
        const element = ref.current;
        if (!element) {
            return;
        }

        const updateSize = () => {
            const nextSize = {
                height: Math.max(0, Math.floor(element.clientHeight)),
                width: Math.max(0, Math.floor(element.clientWidth)),
            };
            setSize(nextSize);
        };

        updateSize();

        const observer = new ResizeObserver(updateSize);
        observer.observe(element);

        return () => {
            observer.disconnect();
        };
    }, []);

    return { ref, size };
};
