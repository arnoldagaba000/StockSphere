import {
    ActivityIcon,
    AlertTriangleIcon,
    ArrowDownIcon,
    ArrowRightIcon,
    ArrowUpIcon,
} from "lucide-react";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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

const CHART_DONUT_COLORS = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
] as const;

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

const buildTrendPath = (trendData: TrendPoint[]): string => {
    if (trendData.length <= 1) {
        return "";
    }

    const width = 100;
    const height = 100;
    const values = trendData.map((point) => point.valueMajor);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = Math.max(1, max - min);

    return trendData
        .map((point, index) => {
            const x = (index / (trendData.length - 1)) * width;
            const y = height - ((point.valueMajor - min) / range) * height;
            return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
        })
        .join(" ");
};

function TrendChartCard({
    currencyCode,
    stockValueDeltaMinor,
    trendData,
}: {
    currencyCode: string;
    stockValueDeltaMinor: number;
    trendData: TrendPoint[];
}) {
    const trendPath = buildTrendPath(trendData);

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
                    <div className="h-72 w-full min-w-0 rounded-md border border-border/70 bg-background/65 p-3">
                        <svg
                            aria-label="Inventory value trend"
                            className="h-full w-full"
                            role="img"
                            viewBox="0 0 100 100"
                        >
                            <line
                                stroke="var(--border)"
                                strokeWidth="0.5"
                                x1="0"
                                x2="100"
                                y1="25"
                                y2="25"
                            />
                            <line
                                stroke="var(--border)"
                                strokeWidth="0.5"
                                x1="0"
                                x2="100"
                                y1="50"
                                y2="50"
                            />
                            <line
                                stroke="var(--border)"
                                strokeWidth="0.5"
                                x1="0"
                                x2="100"
                                y1="75"
                                y2="75"
                            />
                            {trendPath ? (
                                <path
                                    d={trendPath}
                                    fill="none"
                                    stroke="var(--primary)"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                />
                            ) : (
                                <line
                                    stroke="var(--primary)"
                                    strokeLinecap="round"
                                    strokeWidth="2"
                                    x1="0"
                                    x2="100"
                                    y1="50"
                                    y2="50"
                                />
                            )}
                        </svg>
                        <div className="mt-2 flex justify-between text-muted-foreground text-xs">
                            <span>{trendData[0]?.dateLabel}</span>
                            <span>
                                {trendData[
                                    Math.floor((trendData.length - 1) / 2)
                                ]?.dateLabel ?? ""}
                            </span>
                            <span>{trendData.at(-1)?.dateLabel}</span>
                        </div>
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

const buildQueueGradient = (
    queueSlices: QueueSlice[],
    queueTotal: number
): string => {
    if (queueTotal <= 0) {
        return "conic-gradient(var(--muted) 0deg 360deg)";
    }

    let current = 0;
    const segments = queueSlices.map((slice, index) => {
        const segment = (slice.value / queueTotal) * 360;
        const start = current;
        const end = current + segment;
        current = end;
        const color = CHART_DONUT_COLORS[index % CHART_DONUT_COLORS.length];
        return `${color} ${start.toFixed(2)}deg ${end.toFixed(2)}deg`;
    });

    if (current < 360) {
        segments.push(`var(--muted) ${current.toFixed(2)}deg 360deg`);
    }

    return `conic-gradient(${segments.join(", ")})`;
};

function QueueDonutCard({
    queueSlices,
    queueTotal,
}: {
    queueSlices: QueueSlice[];
    queueTotal: number;
}) {
    const gradient = buildQueueGradient(queueSlices, queueTotal);

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-chart-2" />
                    Queue Pressure
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid place-items-center rounded-md border border-border/70 bg-background/65 p-4">
                    <div
                        className="relative h-40 w-40 rounded-full"
                        style={{ background: gradient }}
                    >
                        <div className="absolute inset-[22%] grid place-items-center rounded-full bg-background/95 text-center">
                            <p className="font-semibold text-xl">
                                {queueTotal}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                                Queue Items
                            </p>
                        </div>
                    </div>
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
