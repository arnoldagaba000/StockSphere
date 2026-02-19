import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

const trackingHistorySchema = z
    .object({
        batchNumber: z.string().min(1).optional(),
        serialNumber: z.string().min(1).optional(),
    })
    .refine(
        (value) =>
            Boolean(value.batchNumber?.trim()) ||
            Boolean(value.serialNumber?.trim()),
        {
            message: "Provide a batch number or serial number.",
            path: ["batchNumber"],
        }
    );

export const getTrackingHistory = createServerFn({ method: "GET" })
    .inputValidator(trackingHistorySchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const hasBatchPermission = canUser(
            context.session.user,
            PERMISSIONS.BATCHES_VIEW_DETAILS_HISTORY
        );
        const hasSerialPermission = canUser(
            context.session.user,
            PERMISSIONS.SERIALS_VIEW_HISTORY
        );
        if (!(hasBatchPermission || hasSerialPermission)) {
            throw new Error(
                "You do not have permission to view batch or serial history."
            );
        }

        const where = {
            ...(data.batchNumber ? { batchNumber: data.batchNumber } : {}),
            ...(data.serialNumber ? { serialNumber: data.serialNumber } : {}),
        };

        const [stockItems, movements] = await Promise.all([
            prisma.stockItem.findMany({
                where,
                include: {
                    location: true,
                    product: true,
                    warehouse: true,
                },
                orderBy: { updatedAt: "desc" },
            }),
            prisma.stockMovement.findMany({
                where,
                include: {
                    fromWarehouse: true,
                    toWarehouse: true,
                },
                orderBy: { createdAt: "desc" },
                take: 200,
            }),
        ]);

        return {
            movements: movements.map((movement) => ({
                ...movement,
                quantity: toNumber(movement.quantity),
            })),
            stockItems: stockItems.map((item) => ({
                ...item,
                product: {
                    ...item.product,
                    weight:
                        item.product.weight === null
                            ? null
                            : Number(item.product.weight),
                },
                quantity: toNumber(item.quantity),
                reservedQuantity: toNumber(item.reservedQuantity),
            })),
        };
    });
