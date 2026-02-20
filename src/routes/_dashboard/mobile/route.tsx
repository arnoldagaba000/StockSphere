import {
    createFileRoute,
    Link,
    Outlet,
    useRouter,
} from "@tanstack/react-router";
import { useCallback, useEffect, useReducer } from "react";
import toast from "react-hot-toast";
import { executeMobileOperation } from "@/components/features/mobile/mobile-operations";
import {
    flushQueuedMobileOperations,
    getQueuedMobileOpsCount,
} from "@/components/features/mobile/offline-ops-queue";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_dashboard/mobile")({
    component: MobileLayout,
});

function MobileLayout() {
    const router = useRouter();
    const [syncState, setSyncState] = useReducer(
        (
            state: { isSyncing: boolean; pendingCount: number },
            patch: Partial<{ isSyncing: boolean; pendingCount: number }>
        ) => ({ ...state, ...patch }),
        {
            isSyncing: false,
            pendingCount: 0,
        }
    );

    useEffect(() => {
        setSyncState({ pendingCount: getQueuedMobileOpsCount() });
    }, []);

    const runSync = useCallback(
        async (showToast = true) => {
            if (syncState.isSyncing || typeof window === "undefined") {
                return;
            }
            if (!navigator.onLine) {
                setSyncState({ pendingCount: getQueuedMobileOpsCount() });
                return;
            }

            setSyncState({ isSyncing: true });
            try {
                const result = await flushQueuedMobileOperations(
                    executeMobileOperation
                );
                setSyncState({
                    isSyncing: false,
                    pendingCount: result.failed,
                });

                if (result.processed > 0) {
                    await router.invalidate();
                }
                if (showToast && result.processed > 0) {
                    toast.success(
                        `Synced ${result.processed} queued mobile action(s).`
                    );
                }
            } catch {
                setSyncState({
                    isSyncing: false,
                    pendingCount: getQueuedMobileOpsCount(),
                });
                if (showToast) {
                    toast.error("Failed to sync queued actions.");
                }
            }
        },
        [router, syncState.isSyncing]
    );

    useEffect(() => {
        const onOnline = () => {
            runSync(true).catch(() => undefined);
        };
        const onQueueChange = () => {
            setSyncState({ pendingCount: getQueuedMobileOpsCount() });
        };

        window.addEventListener("online", onOnline);
        window.addEventListener("mobile-ops-queue-changed", onQueueChange);
        runSync(false).catch(() => undefined);
        return () => {
            window.removeEventListener("online", onOnline);
            window.removeEventListener(
                "mobile-ops-queue-changed",
                onQueueChange
            );
        };
    }, [runSync]);

    return (
        <section className="w-full space-y-4">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl">Mobile Operations</h1>
                <p className="text-muted-foreground text-sm">
                    Touch-first workflows for receiving, picking, and transfers.
                </p>
            </div>

            <nav className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                <MobileNavLink label="Receive" to="/mobile/receive" />
                <MobileNavLink label="Pick" to="/mobile/pick" />
                <MobileNavLink label="Transfer" to="/mobile/transfer" />
            </nav>

            <div className="flex items-center justify-between rounded-md border px-3 py-2">
                <p className="text-muted-foreground text-sm">
                    Pending offline actions: {syncState.pendingCount}
                </p>
                <Button
                    disabled={
                        syncState.isSyncing || syncState.pendingCount === 0
                    }
                    onClick={() => {
                        runSync(true).catch(() => undefined);
                    }}
                    size="sm"
                    type="button"
                    variant="outline"
                >
                    {syncState.isSyncing ? "Syncing..." : "Sync now"}
                </Button>
            </div>

            <Outlet />
        </section>
    );
}

function MobileNavLink({ label, to }: { label: string; to: string }) {
    return (
        <Link
            activeProps={{ className: "bg-primary text-primary-foreground" }}
            className="rounded-md border px-3 py-2 text-center text-sm"
            to={to}
        >
            {label}
        </Link>
    );
}
