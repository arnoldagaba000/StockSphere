import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { assertPositiveQuantity, toNumber } from "./helpers";

const receiveGoodsSchema = z.object({
    items: z
        .array(
            z.object({
                batchNumber: z.string().max(100).nullable().optional(),
                expiryDate: z.date().nullable().optional(),
                productId: z.string().min(1),
                quantity: z.preprocess(
                    (value) => Number(value),
                    z.number().positive()
                ),
                unitCost: z.preprocess(
                    (value) =>
                        value === null || value === undefined || value === ""
                            ? null
                            : Number(value),
                    z.number().int().min(0).nullable()
                ),
            })
        )
        .min(1),
    locationId: z.string().nullable().optional(),
    notes: z.string().max(500).nullable().optional(),
    purchaseOrderId: z.string().nullable().optional(),
    warehouseId: z.string().min(1),
});

type ReceiveGoodsInput = z.infer<typeof receiveGoodsSchema>;

const validateDestination = async (data: ReceiveGoodsInput): Promise<void> => {
    const [warehouse, location] = await Promise.all([
        prisma.warehouse.findFirst({
            where: { deletedAt: null, id: data.warehouseId },
        }),
        data.locationId
            ? prisma.location.findFirst({
                  where: {
                      deletedAt: null,
                      id: data.locationId,
                      warehouseId: data.warehouseId,
                  },
              })
            : Promise.resolve(null),
    ]);

    if (!warehouse) {
        throw new Error("Warehouse not found.");
    }
    if (data.locationId && !location) {
        throw new Error("Location not found in selected warehouse.");
    }
};

const applyReceiptItems = async ({
    createdById,
    data,
    receiptId,
    receiptNumber,
    transactionId,
    tx,
}: {
    createdById: string;
    data: ReceiveGoodsInput;
    receiptId: string;
    receiptNumber: string;
    transactionId: string;
    tx: Prisma.TransactionClient;
}) => {
    for (const item of data.items) {
        await tx.goodsReceiptItem.create({
            data: {
                batchNumber: item.batchNumber ?? null,
                expiryDate: item.expiryDate ?? null,
                locationId: data.locationId ?? null,
                productId: item.productId,
                quantity: item.quantity,
                receiptId,
                warehouseId: data.warehouseId,
            },
        });

        const existingBucket = await tx.stockItem.findFirst({
            where: {
                batchNumber: item.batchNumber ?? null,
                locationId: data.locationId ?? null,
                productId: item.productId,
                serialNumber: null,
                warehouseId: data.warehouseId,
            },
        });

        if (existingBucket) {
            await tx.stockItem.update({
                where: { id: existingBucket.id },
                data: {
                    quantity: { increment: item.quantity },
                    unitCost: item.unitCost ?? undefined,
                },
            });
        } else {
            await tx.stockItem.create({
                data: {
                    batchNumber: item.batchNumber ?? null,
                    expiryDate: item.expiryDate ?? null,
                    locationId: data.locationId ?? null,
                    productId: item.productId,
                    quantity: item.quantity,
                    reservedQuantity: 0,
                    serialNumber: null,
                    status: "AVAILABLE",
                    unitCost: item.unitCost ?? null,
                    warehouseId: data.warehouseId,
                },
            });
        }

        await tx.stockMovement.create({
            data: {
                batchNumber: item.batchNumber ?? null,
                createdById,
                inventoryTransactionId: transactionId,
                movementNumber: `${receiptNumber}-${item.productId.slice(0, 6)}`,
                productId: item.productId,
                quantity: item.quantity,
                reason: data.notes ?? "Goods received",
                referenceNumber: receiptNumber,
                serialNumber: null,
                toWarehouseId: data.warehouseId,
                type: "PURCHASE_RECEIPT",
            },
        });
    }
};

const updatePoReceivedQuantities = async ({
    data,
    tx,
}: {
    data: ReceiveGoodsInput;
    tx: Prisma.TransactionClient;
}) => {
    if (!data.purchaseOrderId) {
        return;
    }

    const poItems = await tx.purchaseOrderItem.findMany({
        where: { purchaseOrderId: data.purchaseOrderId },
    });

    for (const item of data.items) {
        const poItem = poItems.find(
            (entry) => entry.productId === item.productId
        );
        if (!poItem) {
            continue;
        }
        await tx.purchaseOrderItem.update({
            where: { id: poItem.id },
            data: {
                receivedQuantity:
                    toNumber(poItem.receivedQuantity) + item.quantity,
            },
        });
    }
};

export const receiveGoods = createServerFn({ method: "POST" })
    .inputValidator(receiveGoodsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.GOODS_RECEIPTS_CREATE)) {
            throw new Error("You do not have permission to receive goods.");
        }

        for (const item of data.items) {
            assertPositiveQuantity(item.quantity, "Receive quantity");
        }

        await validateDestination(data);

        const receiptNumber = `GRN-${Date.now()}`;
        const result = await prisma.$transaction(async (tx) => {
            const receipt = await tx.goodsReceipt.create({
                data: {
                    notes: data.notes ?? null,
                    purchaseOrderId: data.purchaseOrderId ?? null,
                    receiptNumber,
                    receivedBy: context.session.user.id,
                },
            });

            const transaction = await tx.inventoryTransaction.create({
                data: {
                    createdById: context.session.user.id,
                    notes: data.notes ?? "Goods receipt posting",
                    referenceId: receipt.id,
                    referenceType: "GoodsReceipt",
                    transactionNumber: receiptNumber,
                    type: "PURCHASE_RECEIPT",
                },
            });

            await applyReceiptItems({
                createdById: context.session.user.id,
                data,
                receiptId: receipt.id,
                receiptNumber: receipt.receiptNumber,
                transactionId: transaction.id,
                tx,
            });

            await updatePoReceivedQuantities({ data, tx });

            return receipt;
        });

        await logActivity({
            action: "GOODS_RECEIPT_POSTED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    items: data.items.length,
                    receiptNumber,
                    warehouseId: data.warehouseId,
                },
            },
            entity: "GoodsReceipt",
            entityId: result.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return result;
    });
