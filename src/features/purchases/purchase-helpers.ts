import type { POStatus, Prisma } from "@/generated/prisma/client";

const nextSequence = (count: number, width = 5): string =>
    String(count + 1).padStart(width, "0");

export const generatePurchaseOrderNumber = async (
    tx: Prisma.TransactionClient
): Promise<string> => {
    const count = await tx.purchaseOrder.count();
    return `PO-${nextSequence(count)}`;
};

export const generateGoodsReceiptNumber = async (
    tx: Prisma.TransactionClient
): Promise<string> => {
    const count = await tx.goodsReceipt.count();
    return `GRN-${nextSequence(count)}`;
};

export const generateInventoryTransactionNumber = async (
    tx: Prisma.TransactionClient
): Promise<string> => {
    const count = await tx.inventoryTransaction.count();
    return `IT-${nextSequence(count)}`;
};

export const generateStockMovementNumber = (
    transactionNumber: string,
    lineNumber: number
): string => `${transactionNumber}-L${String(lineNumber).padStart(3, "0")}`;

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
