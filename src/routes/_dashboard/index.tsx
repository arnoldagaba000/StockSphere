import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
    ActivityIcon,
    AlertTriangleIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    ArrowUpIcon,
    CalendarClockIcon,
    Clock3Icon,
    DollarSignIcon,
    PackageIcon,
    ShoppingCartIcon,
    TruckIcon,
} from "lucide-react";
import {
    Area,
    AreaChart,
    CartesianGrid,
    Cell,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

const CHART_DONUT_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
] as const;
const CHART_TREND_STROKE = "var(--primary)";
const CHART_AXIS_TICK = "var(--foreground)";
const CHART_GRID = "var(--border)";
const CHART_TOOLTIP_BG = "var(--popover)";
const CHART_TOOLTIP_BORDER = "var(--border)";
const CHART_TOOLTIP_LABEL = "var(--foreground)";
const CHART_TOOLTIP_TEXT = "var(--foreground)";

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
            label: "Expiring 30d",
            value: metrics.expiringIn30Days,
        },
    ];

    const queueTotal = queueSlices.reduce((sum, item) => sum + item.value, 0);
    const lastUpdatedAt = new Date(dataUpdatedAt)
        .toISOString()
        .slice(0, 16)
        .replace("T", " ");

    return (
        <section className="space-y-6">
            <HeroSection lastUpdatedAt={lastUpdatedAt} />

            <div className="grid gap-4 lg:grid-cols-4">
                <KpiCard
                    icon={<DollarSignIcon className="h-4 w-4" />}
                    label="Stock Value"
                    tone={toDeltaTone(stockValueDeltaMinor)}
                    trend={
                        stockValueDeltaMinor === 0
                            ? "No change"
                            : `${toDeltaSign(stockValueDeltaMinor)}${formatCurrencyFromMinorUnits(
                                  Math.abs(stockValueDeltaMinor),
                                  currencyCode
                              )}`
                    }
                    value={formatCurrencyFromMinorUnits(
                        metrics.totalStockValueMinor,
                        currencyCode
                    )}
                />
                <KpiCard
                    icon={<PackageIcon className="h-4 w-4" />}
                    label="Units In Stock"
                    trend={`${Intl.NumberFormat().format(metrics.recentMovementsLast7Days)} movements (7d)`}
                    value={Intl.NumberFormat().format(
                        metrics.totalUnitsInStock
                    )}
                />
                <KpiCard
                    icon={<TruckIcon className="h-4 w-4" />}
                    label="Pending Purchase Orders"
                    trend="Inbound queue"
                    value={String(metrics.pendingPurchaseOrders)}
                />
                <KpiCard
                    icon={<ShoppingCartIcon className="h-4 w-4" />}
                    label="Pending Sales Orders"
                    trend="Outbound queue"
                    value={String(metrics.pendingSalesOrders)}
                />
            </div>

            <div className="grid gap-5 xl:grid-cols-3">
                <TrendChartCard
                    currencyCode={currencyCode}
                    stockValueDeltaMinor={stockValueDeltaMinor}
                    trendData={trendData}
                />
                <QueueDonutCard
                    queueSlices={queueSlices}
                    queueTotal={queueTotal}
                />
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                <AlertsCard metrics={metrics} />
                <OperationsCard metrics={metrics} />
                <QuickActionsCard />
            </div>
        </section>
    );
}

function HeroSection({ lastUpdatedAt }: { lastUpdatedAt: string }) {
    return (
        <header className="rounded-xl border border-border/70 bg-linear-to-br from-card via-card to-primary/10 p-5 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1.5">
                    <h1 className="font-semibold text-2xl">
                        Operations Dashboard
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Inventory health, queue pressure, and order flow in one
                        place.
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge variant="outline">
                        <Clock3Icon className="mr-1 h-3.5 w-3.5" />
                        Last refresh: {lastUpdatedAt} UTC
                    </Badge>
                    <Badge variant="secondary">
                        <ActivityIcon className="mr-1 h-3.5 w-3.5" />
                        Data cache: 5 minutes
                    </Badge>
                </div>
            </div>
        </header>
    );
}

function KpiCard({
    icon,
    label,
    tone = "neutral",
    trend,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    tone?: "negative" | "neutral" | "positive";
    trend: string;
    value: string;
}) {
    const toneClassName = toToneClassName(tone);
    return (
        <Card className="border border-border/70 bg-linear-to-br from-card to-muted/40 shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between gap-2 text-sm">
                    <span>{label}</span>
                    <span className="rounded-md border border-border/70 bg-background/80 p-1.5 text-primary">
                        {icon}
                    </span>
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5">
                <p className="font-semibold text-2xl">{value}</p>
                <p
                    className={`inline-flex items-center gap-1 text-xs ${toneClassName}`}
                >
                    <TrendIcon className="h-3.5 w-3.5" tone={tone} />
                    {trend}
                </p>
            </CardContent>
        </Card>
    );
}

function TrendChartCard({
    currencyCode,
    stockValueDeltaMinor,
    trendData,
}: {
    currencyCode: string;
    stockValueDeltaMinor: number;
    trendData: TrendPoint[];
}) {
    return (
        <Card className="xl:col-span-2">
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <ActivityIcon className="h-4 w-4 text-primary" />
                    Inventory Value Trend (30 days)
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {trendData.length === 0 ? (
                    <div className="rounded-md border border-dashed p-6 text-center text-muted-foreground text-sm">
                        No trend snapshots yet. Stock snapshot data will appear
                        here automatically.
                    </div>
                ) : (
                    <div className="h-72 w-full min-w-0 rounded-md border border-border/70 bg-card/70 p-2">
                        <ResponsiveContainer height="100%" width="100%">
                            <AreaChart data={trendData}>
                                <defs>
                                    <linearGradient
                                        id="dashboardTrendGradient"
                                        x1="0"
                                        x2="0"
                                        y1="0"
                                        y2="1"
                                    >
                                        <stop
                                            offset="5%"
                                            stopColor={CHART_TREND_STROKE}
                                            stopOpacity={0.3}
                                        />
                                        <stop
                                            offset="95%"
                                            stopColor={CHART_TREND_STROKE}
                                            stopOpacity={0}
                                        />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    stroke={CHART_GRID}
                                    strokeDasharray="3 3"
                                />
                                <XAxis
                                    dataKey="dateLabel"
                                    tick={{ fill: CHART_AXIS_TICK }}
                                    tickMargin={8}
                                />
                                <YAxis
                                    tick={{ fill: CHART_AXIS_TICK }}
                                    tickFormatter={(value) =>
                                        Intl.NumberFormat("en-US", {
                                            notation: "compact",
                                        }).format(value)
                                    }
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: CHART_TOOLTIP_BG,
                                        borderColor: CHART_TOOLTIP_BORDER,
                                        color: CHART_TOOLTIP_TEXT,
                                    }}
                                    formatter={(value) =>
                                        formatCurrencyFromMinorUnits(
                                            Math.round(Number(value) * 100),
                                            currencyCode
                                        )
                                    }
                                    itemStyle={{ color: CHART_TOOLTIP_TEXT }}
                                    labelStyle={{ color: CHART_TOOLTIP_LABEL }}
                                />
                                <Area
                                    dataKey="valueMajor"
                                    fill="url(#dashboardTrendGradient)"
                                    stroke={CHART_TREND_STROKE}
                                    strokeWidth={2}
                                    type="monotone"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
                <p
                    className={`text-xs ${toToneClassName(toDeltaTone(stockValueDeltaMinor))}`}
                >
                    <TrendIcon
                        className="mr-1 inline h-3.5 w-3.5 align-[-2px]"
                        tone={toDeltaTone(stockValueDeltaMinor)}
                    />
                    Trend delta: {toDeltaSign(stockValueDeltaMinor)}
                    {formatCurrencyFromMinorUnits(
                        Math.abs(stockValueDeltaMinor),
                        currencyCode
                    )}{" "}
                    vs previous snapshot.
                </p>
            </CardContent>
        </Card>
    );
}

function QueueDonutCard({
    queueSlices,
    queueTotal,
}: {
    queueSlices: QueueSlice[];
    queueTotal: number;
}) {
    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-chart-2" />
                    Queue Pressure
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="h-52 w-full min-w-0 rounded-md border border-border/70 bg-card/70 p-2">
                    <ResponsiveContainer height="100%" width="100%">
                        <PieChart>
                            <Pie
                                cx="50%"
                                cy="50%"
                                data={queueSlices}
                                dataKey="value"
                                innerRadius={48}
                                nameKey="label"
                                outerRadius={74}
                                stroke="var(--border)"
                                strokeWidth={1}
                            >
                                {queueSlices.map((slice, index) => (
                                    <Cell
                                        fill={
                                            CHART_DONUT_COLORS[
                                                index %
                                                    CHART_DONUT_COLORS.length
                                            ]
                                        }
                                        key={slice.key}
                                    />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: CHART_TOOLTIP_BG,
                                    borderColor: CHART_TOOLTIP_BORDER,
                                    color: CHART_TOOLTIP_TEXT,
                                }}
                                itemStyle={{ color: CHART_TOOLTIP_TEXT }}
                                labelStyle={{ color: CHART_TOOLTIP_LABEL }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {queueSlices.map((slice, index) => (
                    <div className="space-y-1 text-xs" key={slice.key}>
                        <div className="flex items-center justify-between">
                            <span className="text-foreground/90">
                                {slice.label}
                            </span>
                            <span className="font-medium">{slice.value}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-muted">
                            <div
                                className="h-full rounded-full"
                                style={{
                                    backgroundColor:
                                        CHART_DONUT_COLORS[
                                            index % CHART_DONUT_COLORS.length
                                        ],
                                    width: `${queueTotal === 0 ? 0 : Math.round((slice.value / queueTotal) * 100)}%`,
                                }}
                            />
                        </div>
                    </div>
                ))}
                <p className="text-foreground/80 text-xs">
                    Total active queue items: {queueTotal}
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
                    <AlertTriangleIcon className="h-4 w-4 text-chart-5" />
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
                    <ActivityIcon className="h-4 w-4 text-primary" />
                    Quick Actions
                </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-2">
                <ActionButton label="Open Stock Operations" to="/stock" />
                <ActionButton label="Open Reports" to="/reports" />
                <ActionButton
                    label="Go to Purchase Orders"
                    to="/purchase-orders"
                />
                <ActionButton label="Go to Sales Orders" to="/sales-orders" />
            </CardContent>
        </Card>
    );
}

function ActionButton({ label, to }: { label: string; to: string }) {
    return (
        <Button
            className="justify-start"
            nativeButton={false}
            render={<Link to={to} />}
            variant="outline"
        >
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
        <div className="space-y-2 rounded-md border p-3">
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

    return (
        <div className="flex items-center justify-between gap-2 rounded-md border p-2">
            <span className="text-sm">{label}</span>
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
        return "text-emerald-600";
    }
    if (tone === "negative") {
        return "text-red-600";
    }
    return "text-muted-foreground";
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
