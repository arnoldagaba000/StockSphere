import type { POStatus } from "@/generated/prisma/client";

const sanitizeCodeSegment = (value: string): string =>
    value.replace(/[^A-Z0-9]/g, "").slice(0, 24);

const createUniqueCode = (prefix: string): string => {
    const timestampPart = new Date()
        .toISOString()
        .replaceAll("-", "")
        .replaceAll(":", "")
        .replace(".", "")
        .replace("T", "")
        .replace("Z", "")
        .slice(0, 14);
    const randomPart = sanitizeCodeSegment(crypto.randomUUID()).slice(0, 8);
    return `${prefix}-${timestampPart}-${randomPart}`;
};

export const generatePurchaseOrderNumber = (prefix = "PO"): string =>
    createUniqueCode(prefix);

export const generateGoodsReceiptNumber = (
    idempotencyKey?: string,
    prefix = "GRN"
): string =>
    idempotencyKey
        ? `${prefix}-${sanitizeCodeSegment(idempotencyKey)}`
        : createUniqueCode(prefix);

export const generateInventoryTransactionNumber = (prefix = "IT"): string =>
    createUniqueCode(prefix);

export const generateStockMovementNumber = (
    prefix: string,
    transactionNumber: string,
    lineNumber: number
): string =>
    `${prefix}-${transactionNumber}-L${String(lineNumber).padStart(3, "0")}`;

export const assertOrderStatus = (
    currentStatus: POStatus,
    expectedStatus: POStatus,
    action: string
): void => {
    if (currentStatus !== expectedStatus) {
        throw new Error(
            `Cannot ${action} purchase order in "${currentStatus}" status.`
        );
    }
};

export const retryOnUniqueConstraint = async <TResult>(
    operation: () => Promise<TResult>,
    retries = 3
): Promise<TResult> => {
    let lastError: unknown;
    for (let attempt = 1; attempt <= retries; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;
            const hasCode =
                typeof error === "object" &&
                error !== null &&
                "code" in error &&
                (error as { code?: string }).code === "P2002";
            if (!hasCode || attempt === retries) {
                throw error;
            }
        }
    }

    throw lastError;
};
