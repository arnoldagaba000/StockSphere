import {
    ActivityIcon,
    AlertTriangleIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    ArrowUpIcon,
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

interface QueueSlice {
    key: string;
    label: string;
    value: number;
}

interface TrendPoint {
    dateLabel: string;
    valueMajor: number;
}

interface DashboardChartsSectionProps {
    currencyCode: string;
    queueSlices: QueueSlice[];
    queueTotal: number;
    stockValueDeltaMinor: number;
    trendData: TrendPoint[];
}

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
                    <div className="rounded-md border border-dashed p-6 text-center text-foreground/75 text-sm">
                        No trend snapshots yet. Stock snapshot data will appear
                        here automatically.
                    </div>
                ) : (
                    <div className="h-72 w-full min-w-0 rounded-md border border-border/70 bg-background/65 p-2">
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
                                            stopOpacity={0.36}
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
                    className={`text-xs ${toToneClassName(
                        toDeltaTone(stockValueDeltaMinor)
                    )}`}
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
                <div className="h-52 w-full min-w-0 rounded-md border border-border/70 bg-background/65 p-2">
                    <ResponsiveContainer height="100%" width="100%">
                        <PieChart>
                            <Pie
                                cx="50%"
                                cy="50%"
                                data={queueSlices}
                                dataKey="value"
                                innerRadius={50}
                                nameKey="label"
                                outerRadius={75}
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
                        <div className="h-1.5 rounded-full bg-muted/85">
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

export function DashboardChartsSection({
    currencyCode,
    queueSlices,
    queueTotal,
    stockValueDeltaMinor,
    trendData,
}: DashboardChartsSectionProps) {
    return (
        <div className="grid gap-5 xl:grid-cols-3">
            <TrendChartCard
                currencyCode={currencyCode}
                stockValueDeltaMinor={stockValueDeltaMinor}
                trendData={trendData}
            />
            <QueueDonutCard queueSlices={queueSlices} queueTotal={queueTotal} />
        </div>
    );
}
