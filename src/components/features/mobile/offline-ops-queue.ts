import type {
    MobileOperationPayload,
    QueuedMobileOperation,
} from "@/components/features/mobile/mobile-operations";

const MOBILE_OPS_QUEUE_KEY = "mobile_ops_queue_v1";

const canUseStorage = (): boolean => {
    return typeof window !== "undefined" && typeof localStorage !== "undefined";
};

const readQueue = (): QueuedMobileOperation<MobileOperationPayload>[] => {
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
        ) as QueuedMobileOperation<MobileOperationPayload>[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
};

const writeQueue = (
    queue: QueuedMobileOperation<MobileOperationPayload>[]
): void => {
    if (!canUseStorage()) {
        return;
    }

    localStorage.setItem(MOBILE_OPS_QUEUE_KEY, JSON.stringify(queue));
    window.dispatchEvent(new Event("mobile-ops-queue-changed"));
};

export const getQueuedMobileOpsCount = (): number => readQueue().length;

export const queueMobileOperation = (
    operation: QueuedMobileOperation<MobileOperationPayload>
): void => {
    writeQueue([...readQueue(), operation]);
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
    const remaining: QueuedMobileOperation<MobileOperationPayload>[] = [];

    for (const operation of initialQueue) {
        try {
            await execute(operation);
            processed += 1;
        } catch {
            remaining.push(operation);
        }
    }

    writeQueue(remaining);
    return { failed: remaining.length, processed };
};
