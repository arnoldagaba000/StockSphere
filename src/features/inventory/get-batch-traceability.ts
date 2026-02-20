import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

export const getBatchTraceability = createServerFn({ method: "GET" })
    .inputValidator(
        z.object({
            productId: z.string(),
            batchNumber: z.string(),
        })
    )
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.BATCHES_GENEALOGY_VIEW)
        ) {
            throw new Error(
                "You do not have permission to view batch traceability."
            );
        }

        // Run all three queries in parallel — they're independent of each other
        const [receipts, shipments, currentStock] = await Promise.all([
            // Where did this batch come from? Which purchase orders received it?
            prisma.goodsReceiptItem.findMany({
                where: {
                    productId: data.productId,
                    batchNumber: data.batchNumber,
                },
                include: {
                    receipt: {
                        include: {
                            purchaseOrder: {
                                include: {
                                    supplier: {
                                        select: { name: true, code: true },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { receipt: { receivedDate: "asc" } },
            }),

            // Where did this batch go? Which customers received it?
            prisma.shipmentItem.findMany({
                where: {
                    batchNumber: data.batchNumber,
                    productId: data.productId,
                },
                include: {
                    shipment: {
                        include: {
                            salesOrder: {
                                include: {
                                    customer: {
                                        select: { name: true, code: true },
                                    },
                                },
                            },
                        },
                    },
                },
                orderBy: { shipment: { shippedDate: "asc" } },
            }),

            // Where is the remaining stock from this batch right now?
            prisma.stockItem.findMany({
                where: {
                    productId: data.productId,
                    batchNumber: data.batchNumber,
                    quantity: { gt: 0 },
                },
                include: {
                    warehouse: true,
                    location: true,
                },
            }),
        ]);

        // Calculate how much of the batch is still on hand vs. shipped
        const normalizedReceipts = receipts.map((receipt) => ({
            ...receipt,
            quantity: toNumber(receipt.quantity),
        }));
        const normalizedShipments = shipments.map((shipment) => ({
            ...shipment,
            quantity: toNumber(shipment.quantity),
        }));
        const normalizedCurrentStock = currentStock.map((stockItem) => ({
            ...stockItem,
            quantity: toNumber(stockItem.quantity),
            reservedQuantity: toNumber(stockItem.reservedQuantity),
        }));

        const totalReceived = normalizedReceipts.reduce(
            (sum, receipt) => sum + receipt.quantity,
            0
        );
        const totalShipped = normalizedShipments.reduce(
            (sum, shipment) => sum + shipment.quantity,
            0
        );
        const totalOnHand = normalizedCurrentStock.reduce(
            (sum, stockItem) => sum + stockItem.quantity,
            0
        );

        return {
            batchNumber: data.batchNumber,
            summary: { totalReceived, totalShipped, totalOnHand },
            receipts: normalizedReceipts,
            shipments: normalizedShipments,
            currentStock: normalizedCurrentStock,
        };
    });
