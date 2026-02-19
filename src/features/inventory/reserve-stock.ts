import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { assertPositiveQuantity, toNumber } from "./helpers";

const reserveStockSchema = z.object({
    notes: z.string().max(500).nullable().optional(),
    quantity: z.preprocess((value) => Number(value), z.number().positive()),
    referenceNumber: z.string().max(120).nullable().optional(),
    stockItemId: z.string().min(1),
});

export const reserveStock = createServerFn({ method: "POST" })
    .inputValidator(reserveStockSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.INVENTORY_RESERVED_VIEW)
        ) {
            throw new Error("You do not have permission to reserve stock.");
        }

        assertPositiveQuantity(data.quantity, "Reserve quantity");
        const stockItem = await prisma.stockItem.findUnique({
            where: { id: data.stockItemId },
        });
        if (!stockItem) {
            throw new Error("Stock item not found.");
        }

        const available =
            toNumber(stockItem.quantity) - toNumber(stockItem.reservedQuantity);
        if (data.quantity > available) {
            throw new Error("Reserve quantity exceeds available stock.");
        }

        const updated = await prisma.stockItem.update({
            where: { id: stockItem.id },
            data: {
                reservedQuantity:
                    toNumber(stockItem.reservedQuantity) + data.quantity,
            },
        });

        await logActivity({
            action: "STOCK_RESERVED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    quantity: toNumber(updated.quantity),
                    referenceNumber: data.referenceNumber ?? null,
                    reservedQuantity: toNumber(updated.reservedQuantity),
                    stockItemId: updated.id,
                },
            },
            entity: "StockItem",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            ...updated,
            quantity: toNumber(updated.quantity),
            reservedQuantity: toNumber(updated.reservedQuantity),
        };
    });

const releaseStockSchema = z.object({
    notes: z.string().max(500).nullable().optional(),
    quantity: z.preprocess((value) => Number(value), z.number().positive()),
    referenceNumber: z.string().max(120).nullable().optional(),
    stockItemId: z.string().min(1),
});

export const releaseReservedStock = createServerFn({ method: "POST" })
    .inputValidator(releaseStockSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.INVENTORY_RESERVED_VIEW)
        ) {
            throw new Error("You do not have permission to release stock.");
        }

        assertPositiveQuantity(data.quantity, "Release quantity");
        const stockItem = await prisma.stockItem.findUnique({
            where: { id: data.stockItemId },
        });
        if (!stockItem) {
            throw new Error("Stock item not found.");
        }

        const reserved = toNumber(stockItem.reservedQuantity);
        if (data.quantity > reserved) {
            throw new Error("Release quantity exceeds reserved stock.");
        }

        const updated = await prisma.stockItem.update({
            where: { id: stockItem.id },
            data: {
                reservedQuantity: reserved - data.quantity,
            },
        });

        await logActivity({
            action: "STOCK_RESERVATION_RELEASED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    quantity: toNumber(updated.quantity),
                    referenceNumber: data.referenceNumber ?? null,
                    reservedQuantity: toNumber(updated.reservedQuantity),
                    stockItemId: updated.id,
                },
            },
            entity: "StockItem",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            ...updated,
            quantity: toNumber(updated.quantity),
            reservedQuantity: toNumber(updated.reservedQuantity),
        };
    });
