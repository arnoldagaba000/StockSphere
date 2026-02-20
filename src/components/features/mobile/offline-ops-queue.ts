import type {
    MobileOperationPayload,
    QueuedMobileOperation,
} from "@/components/features/mobile/mobile-operations";

const MOBILE_OPS_QUEUE_KEY = "mobile_ops_queue_v1";

export interface StoredQueuedMobileOperation
    extends QueuedMobileOperation<MobileOperationPayload> {
    lastError: string | null;
    retryCount: number;
}

const canUseStorage = (): boolean => {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
};

const requestBackgroundSync = async (): Promise<void> => {
    if (typeof window === "undefined") {
        return;
    }
    if (!("serviceWorker" in navigator)) {
        return;
    }

    const registration = await navigator.serviceWorker.ready;
    const registrationWithSync = registration as ServiceWorkerRegistration & {
        sync?: { register: (tag: string) => Promise<void> };
    };

    if (!registrationWithSync.sync?.register) {
        return;
    }

    await registrationWithSync.sync.register("mobile-ops-sync");
};

const normalizeOperation = (
    operation: QueuedMobileOperation<MobileOperationPayload> &
        Partial<StoredQueuedMobileOperation>
): StoredQueuedMobileOperation => ({
    ...operation,
    lastError: operation.lastError ?? null,
    retryCount: operation.retryCount ?? 0,
});

const readQueue = (): StoredQueuedMobileOperation[] => {
    if (!canUseStorage()) {
        return [];
    }

    const rawQueue = localStorage.getItem(MOBILE_OPS_QUEUE_KEY);
    if (!rawQueue) {
        return [];
    }

    try {
        const parsed = JSON.parse(
            rawQueue
        ) as (QueuedMobileOperation<MobileOperationPayload> &
            Partial<StoredQueuedMobileOperation>)[];
        return Array.isArray(parsed) ? parsed.map(normalizeOperation) : [];
    } catch {
        return [];
    }
};

const writeQueue = (queue: StoredQueuedMobileOperation[]): void => {
    if (!canUseStorage()) {
        return;
    }

    localStorage.setItem(MOBILE_OPS_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event("mobile-ops-queue-changed"));
    requestBackgroundSync().catch(() => undefined);
};

export const getQueuedMobileOperations = (): StoredQueuedMobileOperation[] =>
    readQueue();

export const queueMobileOperation = (
    operation: QueuedMobileOperation<MobileOperationPayload>
): void => {
    writeQueue([...readQueue(), normalizeOperation(operation)]);
};

export const isLikelyNetworkError = (error: unknown): boolean => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
        return true;
    }

    if (error instanceof TypeError) {
        return true;
    }

    if (!(error instanceof Error)) {
        return false;
    }

    const message = error.message.toLowerCase();
    return (
        message.includes("network") ||
        message.includes("fetch") ||
        message.includes("offline") ||
        message.includes("connection")
    );
};

const getErrorMessage = (error: unknown): string => {
    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message;
    }

    return "Unknown error during sync.";
};

interface FlushResult {
    failed: number;
    processed: number;
}

export const flushQueuedMobileOperations = async (
    execute: (
        operation: QueuedMobileOperation<MobileOperationPayload>
    ) => Promise<void>
): Promise<FlushResult> => {
    const initialQueue = readQueue();
    if (initialQueue.length === 0) {
        return { failed: 0, processed: 0 };
    }

    let processed = 0;
    const remaining: StoredQueuedMobileOperation[] = [];

    for (const operation of initialQueue) {
        try {
            await execute(operation);
            processed += 1;
        } catch (error: unknown) {
            remaining.push({
                ...operation,
                lastError: getErrorMessage(error),
                retryCount: operation.retryCount + 1,
            });
        }
    }

    writeQueue(remaining);
    return { failed: remaining.length, processed };
};

export const removeQueuedMobileOperation = (operationId: string): void => {
    writeQueue(readQueue().filter((operation) => operation.id !== operationId));
};
