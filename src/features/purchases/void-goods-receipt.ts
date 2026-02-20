import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import {
    generateInventoryTransactionNumber,
    generateStockMovementNumber,
} from "@/features/purchases/purchase-helpers";
import { getNumberingPrefixes } from "@/features/settings/get-numbering-prefixes";
import type { Prisma } from "@/generated/prisma/client";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const voidGoodsReceiptSchema = z.object({
    goodsReceiptId: z.string().cuid("Invalid goods receipt id"),
    reason: z.string().trim().min(3).max(300),
});

const VOID_MARKER = "[VOIDED]";

interface ReceiptItemShape {
    batchNumber: string | null;
    locationId: string | null;
    productId: string;
    quantity: Prisma.Decimal;
    warehouseId: string;
}

const ensureReceiptCanBeVoided = (notes: string | null): void => {
    if (notes?.includes(VOID_MARKER)) {
        throw new Error("This goods receipt has already been voided.");
    }
};

const findStockBucket = (
    tx: Prisma.TransactionClient,
    item: ReceiptItemShape
) =>
    tx.stockItem.findFirst({
        where: {
            batchNumber: item.batchNumber ?? null,
            locationId: item.locationId ?? null,
            productId: item.productId,
            serialNumber: null,
            warehouseId: item.warehouseId,
        },
    });

const reverseStockForItem = async ({
    actorUserId,
    item,
    lineNumber,
    receiptNumber,
    reversalTransactionId,
    stockMovementPrefix,
    transactionNumber,
    tx,
    voidReason,
}: {
    actorUserId: string;
    item: ReceiptItemShape;
    lineNumber: number;
    receiptNumber: string;
    reversalTransactionId: string;
    stockMovementPrefix: string;
    transactionNumber: string;
    tx: Prisma.TransactionClient;
    voidReason: string;
}) => {
    const stockItem = await findStockBucket(tx, item);
    if (!stockItem || Number(stockItem.quantity) < Number(item.quantity)) {
        throw new Error(
            "Cannot void receipt because stock has already been consumed or moved."
        );
    }

    await tx.stockItem.update({
        data: {
            quantity: Number(stockItem.quantity) - Number(item.quantity),
        },
        where: { id: stockItem.id },
    });

    await tx.stockMovement.create({
        data: {
            batchNumber: item.batchNumber ?? null,
            createdById: actorUserId,
            fromWarehouseId: item.warehouseId,
            inventoryTransactionId: reversalTransactionId,
            movementNumber: generateStockMovementNumber(
                stockMovementPrefix,
                transactionNumber,
                lineNumber
            ),
            productId: item.productId,
            quantity: -Number(item.quantity),
            reason: `Void receipt ${receiptNumber}: ${voidReason}`,
            referenceNumber: receiptNumber,
            serialNumber: null,
            type: "ADJUSTMENT",
        },
    });
};

const recomputePurchaseOrderReceiptState = async ({
    purchaseOrderId,
    receiptItems,
    tx,
}: {
    purchaseOrderId: string;
    receiptItems: ReceiptItemShape[];
    tx: Prisma.TransactionClient;
}) => {
    const orderItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId },
    });

    for (const item of receiptItems) {
        const poItem = orderItems.find(
            (entry) => entry.productId === item.productId
        );
        if (!poItem) {
            continue;
        }

        await tx.purchaseOrderItem.update({
            data: {
                receivedQuantity: Math.max(
                    0,
                    Number(poItem.receivedQuantity) - Number(item.quantity)
                ),
            },
            where: { id: poItem.id },
        });
    }

    const refreshedItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId },
    });
    const hasAnyReceivedQuantity = refreshedItems.some(
        (item) => Number(item.receivedQuantity) > 0
    );

    await tx.purchaseOrder.update({
        data: {
            receivedDate: null,
            status: hasAnyReceivedQuantity ? "PARTIALLY_RECEIVED" : "APPROVED",
        },
        where: { id: purchaseOrderId },
    });
};

const applyVoidMarkerToReceipt = async ({
    reason,
    receiptId,
    receiptNotes,
    tx,
}: {
    reason: string;
    receiptId: string;
    receiptNotes: string | null;
    tx: Prisma.TransactionClient;
}) =>
    tx.goodsReceipt.update({
        data: {
            notes: `${receiptNotes ?? ""}\n${VOID_MARKER} ${new Date().toISOString()} ${reason}`.trim(),
        },
        where: { id: receiptId },
    });

export const voidGoodsReceipt = createServerFn({ method: "POST" })
    .inputValidator(voidGoodsReceiptSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.GOODS_RECEIPTS_VOID_REVERSE
            )
        ) {
            throw new Error(
                "You do not have permission to void goods receipts."
            );
        }

        const receipt = await prisma.goodsReceipt.findUnique({
            include: { items: true },
            where: { id: data.goodsReceiptId },
        });
        if (!receipt) {
            throw new Error("Goods receipt not found.");
        }

        ensureReceiptCanBeVoided(receipt.notes);
        const numberingPrefixes = await getNumberingPrefixes();

        await prisma.$transaction(async (tx) => {
            const transactionNumber = generateInventoryTransactionNumber(
                numberingPrefixes.inventoryTransaction
            );
            const reversalTransaction = await tx.inventoryTransaction.create({
                data: {
                    createdById: context.session.user.id,
                    notes: `Goods receipt void ${receipt.receiptNumber}`,
                    referenceId: receipt.id,
                    referenceType: "GoodsReceiptVoid",
                    transactionNumber,
                    type: "ADJUSTMENT",
                },
            });

            let lineNumber = 1;
            for (const item of receipt.items) {
                await reverseStockForItem({
                    actorUserId: context.session.user.id,
                    item,
                    lineNumber,
                    receiptNumber: receipt.receiptNumber,
                    reversalTransactionId: reversalTransaction.id,
                    stockMovementPrefix: numberingPrefixes.stockMovement,
                    transactionNumber,
                    tx,
                    voidReason: data.reason,
                });
                lineNumber += 1;
            }

            if (receipt.purchaseOrderId) {
                await recomputePurchaseOrderReceiptState({
                    purchaseOrderId: receipt.purchaseOrderId,
                    receiptItems: receipt.items,
                    tx,
                });
            }

            await applyVoidMarkerToReceipt({
                reason: data.reason,
                receiptId: receipt.id,
                receiptNotes: receipt.notes,
                tx,
            });
        });

        await logActivity({
            action: "GOODS_RECEIPT_VOIDED",
            actorUserId: context.session.user.id,
            changes: {
                after: { voided: true },
                reason: data.reason,
            },
            entity: "GoodsReceipt",
            entityId: receipt.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
