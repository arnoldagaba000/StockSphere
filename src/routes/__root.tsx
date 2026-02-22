import { TanStackDevtools } from "@tanstack/react-devtools";
import { FormDevtoolsPanel } from "@tanstack/react-form-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import {
    createRootRouteWithContext,
    HeadContent,
    isNotFound,
    Link,
    Scripts,
} from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { ThemeProvider } from "next-themes";
import { useEffect } from "react";
import { Toaster } from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import appCss from "../styles.css?url";

interface MyRouterContext {
    queryClient: QueryClient;
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
    errorComponent: RootRouteErrorComponent,
    head: () => ({
        meta: [
            {
                charSet: "utf-8",
            },
            {
                name: "viewport",
                content: "width=device-width, initial-scale=1",
            },
            {
                name: "theme-color",
                content: "#0f172a",
            },
            {
                title: "StockSphere",
            },
        ],
        links: [
            {
                rel: "stylesheet",
                href: appCss,
            },
            {
                rel: "manifest",
                href: "/manifest.json",
            },
        ],
    }),
    notFoundComponent: RootNotFoundComponent,
    shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <HeadContent />
            </head>

            <body suppressHydrationWarning>
                <ThemeProvider
                    attribute="class"
                    enableColorScheme
                    enableSystem
                    storageKey="theme"
                >
                    {children}
                </ThemeProvider>

                <Toaster position="top-right" />
                <ServiceWorkerRegistration />

                <TanStackDevtools
                    config={{
                        position: "bottom-right",
                    }}
                    plugins={[
                        {
                            name: "Tanstack Router",
                            render: <TanStackRouterDevtoolsPanel />,
                        },
                        {
                            name: "Tanstack Query",
                            render: <ReactQueryDevtoolsPanel />,
                        },
                        {
                            name: "Tanstack Form",
                            render: <FormDevtoolsPanel />,
                        },
                    ]}
                />
                <Scripts />
            </body>
        </html>
    );
}

function ServiceWorkerRegistration() {
    useEffect(() => {
        if (!("serviceWorker" in navigator)) {
            return;
        }
        navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }, []);

    return null;
}

function RootRouteErrorComponent({
    error,
    reset,
}: {
    error: unknown;
    reset: () => void;
}) {
    const errorMessage =
        error instanceof Error
            ? error.message
            : "An unexpected error occurred.";

    if (isNotFound(error)) {
        return <RootNotFoundComponent />;
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <Card className="w-full max-w-lg border border-border/70">
                <CardHeader>
                    <CardTitle>Something went wrong</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                        {errorMessage}
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Button onClick={reset} type="button">
                            Try Again
                        </Button>
                        <Button asChild type="button" variant="outline">
                            <Link to="/">Go to Dashboard</Link>
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </main>
    );
}

function RootNotFoundComponent() {
    return (
        <main className="flex min-h-screen items-center justify-center bg-background p-6">
            <Card className="w-full max-w-lg border border-border/70">
                <CardHeader>
                    <CardTitle>Page not found</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground text-sm">
                        The page you requested does not exist or was moved.
                    </p>
                    <Button asChild type="button">
                        <Link to="/">Back to Dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </main>
    );
}
