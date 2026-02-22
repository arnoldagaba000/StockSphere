import { Link } from "@tanstack/react-router";
import { AlertTriangleIcon, RefreshCcwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface RouteErrorFallbackProps {
    error: unknown;
    reset: () => void;
    title: string;
    to: string;
}

interface RoutePendingFallbackProps {
    subtitle: string;
    title: string;
}

const toErrorMessage = (error: unknown): string =>
    error instanceof Error ? error.message : "An unexpected error occurred.";

export const RouteErrorFallback = ({
    error,
    reset,
    title,
    to,
}: RouteErrorFallbackProps) => (
    <section className="w-full">
        <Card className="max-w-xl border border-border/70">
            <CardHeader>
                <CardTitle className="inline-flex items-center gap-2">
                    <AlertTriangleIcon className="h-4 w-4 text-destructive" />
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <p className="text-muted-foreground text-sm">
                    {toErrorMessage(error)}
                </p>
                <div className="flex flex-wrap gap-2">
                    <Button onClick={reset} type="button">
                        <RefreshCcwIcon className="mr-1.5 h-4 w-4" />
                        Try Again
                    </Button>
                    <Button
                        nativeButton={false}
                        render={<Link to={to} />}
                        type="button"
                        variant="outline"
                    >
                        Back
                    </Button>
                </div>
            </CardContent>
        </Card>
    </section>
);

export const RoutePendingFallback = ({
    subtitle,
    title,
}: RoutePendingFallbackProps) => (
    <section className="w-full">
        <Card className="max-w-3xl border border-border/70">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <p className="text-muted-foreground text-sm">{subtitle}</p>
            </CardHeader>
            <CardContent className="space-y-3">
                <Skeleton className="h-8 w-2/5" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
            </CardContent>
        </Card>
    </section>
);
