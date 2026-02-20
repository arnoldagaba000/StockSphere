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
    getQueuedMobileOperations,
    removeQueuedMobileOperation,
    type StoredQueuedMobileOperation,
} from "@/components/features/mobile/offline-ops-queue";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_dashboard/mobile")({
    component: MobileLayout,
});

function MobileLayout() {
    const router = useRouter();
    const [syncState, setSyncState] = useReducer(
        (
            state: {
                isSyncing: boolean;
                pendingCount: number;
                queuedOperations: StoredQueuedMobileOperation[];
            },
            patch: Partial<{
                isSyncing: boolean;
                pendingCount: number;
                queuedOperations: StoredQueuedMobileOperation[];
            }>
        ) => ({ ...state, ...patch }),
        {
            isSyncing: false,
            pendingCount: 0,
            queuedOperations: [],
        }
    );

    const refreshQueueState = useCallback(() => {
        const queuedOperations = getQueuedMobileOperations();
        setSyncState({
            pendingCount: queuedOperations.length,
            queuedOperations,
        });
    }, []);

    useEffect(() => {
        refreshQueueState();
    }, [refreshQueueState]);

    const runSync = useCallback(
        async (showToast = true) => {
            if (syncState.isSyncing || typeof window === "undefined") {
                return;
            }
            if (!navigator.onLine) {
                refreshQueueState();
                return;
            }

            setSyncState({ isSyncing: true });
            try {
                const result = await flushQueuedMobileOperations(
                    executeMobileOperation
                );
                setSyncState({ isSyncing: false });
                refreshQueueState();

                if (result.processed > 0) {
                    await router.invalidate();
                }
                if (showToast && result.processed > 0) {
                    toast.success(
                        `Synced ${result.processed} queued mobile action(s).`
                    );
                }
                if (showToast && result.failed > 0) {
                    toast.error(
                        `${result.failed} queued action(s) still failing.`
                    );
                }
            } catch {
                setSyncState({ isSyncing: false });
                refreshQueueState();
                if (showToast) {
                    toast.error("Failed to sync queued actions.");
                }
            }
        },
        [refreshQueueState, router, syncState.isSyncing]
    );

    useEffect(() => {
        const onOnline = () => {
            runSync(true).catch(() => undefined);
        };
        const onQueueChange = () => {
            refreshQueueState();
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
    }, [refreshQueueState, runSync]);

    const handleRemoveQueuedOperation = (operationId: string) => {
        removeQueuedMobileOperation(operationId);
        refreshQueueState();
    };

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

            {syncState.queuedOperations.length > 0 ? (
                <div className="space-y-2 rounded-md border p-3">
                    <p className="font-medium text-sm">Queued Actions</p>
                    <div className="space-y-2">
                        {syncState.queuedOperations.map((operation) => (
                            <div
                                className="rounded-md border px-2 py-2 text-xs"
                                key={operation.id}
                            >
                                <div className="flex items-center justify-between gap-2">
                                    <p className="font-medium">
                                        {operation.type} ·{" "}
                                        {new Date(
                                            operation.createdAt
                                        ).toLocaleString()}
                                    </p>
                                    <Button
                                        onClick={() =>
                                            handleRemoveQueuedOperation(
                                                operation.id
                                            )
                                        }
                                        size="sm"
                                        type="button"
                                        variant="ghost"
                                    >
                                        Remove
                                    </Button>
                                </div>
                                <p className="text-muted-foreground">
                                    {formatQueuedOperation(operation)}
                                </p>
                                {operation.retryCount > 0 ? (
                                    <p className="text-destructive">
                                        Retries: {operation.retryCount} · Last
                                        error:{" "}
                                        {operation.lastError ??
                                            "Unknown sync error"}
                                    </p>
                                ) : null}
                            </div>
                        ))}
                    </div>
                </div>
            ) : null}

            <Outlet />
        </section>
    );
}

const formatQueuedOperation = (
    operation: StoredQueuedMobileOperation
): string => {
    if (operation.type === "RECEIVE") {
        const payload = operation.payload as {
            productId: string;
            quantity: number;
            warehouseId: string;
        };
        return `Product ${payload.productId.slice(0, 8)}... · qty ${payload.quantity} · wh ${payload.warehouseId.slice(0, 8)}...`;
    }

    if (operation.type === "PICK") {
        const payload = operation.payload as { salesOrderId: string };
        return `Sales order ${payload.salesOrderId.slice(0, 8)}...`;
    }

    const payload = operation.payload as {
        quantity: number;
        stockItemId: string;
        toWarehouseId: string;
    };
    return `Stock ${payload.stockItemId.slice(0, 8)}... · qty ${payload.quantity} · to ${payload.toWarehouseId.slice(0, 8)}...`;
};

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
