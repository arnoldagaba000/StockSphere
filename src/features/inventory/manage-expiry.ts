import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import {
    generateInventoryTransactionNumber,
    generateStockMovementNumber,
} from "@/features/purchases/purchase-helpers";
import { getNumberingPrefixes } from "@/features/settings/get-numbering-prefixes";
import type { StockStatus } from "@/generated/prisma/client";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { type AppPermission, PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

const expiryAlertsSchema = z.object({
    includeExpired: z.boolean().optional(),
    withinDays: z.preprocess(
        (value) => (value === undefined ? 30 : Number(value)),
        z.number().min(1).max(365)
    ),
});

export const getExpiryAlerts = createServerFn({ method: "GET" })
    .inputValidator(expiryAlertsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_REPORT_EXPIRY_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to view expiry alerts."
            );
        }

        const now = new Date();
        const future = new Date();
        future.setDate(future.getDate() + data.withinDays);

        const items = await prisma.stockItem.findMany({
            where: {
                expiryDate: {
                    gte: data.includeExpired ? undefined : now,
                    lte: future,
                },
                status: {
                    in: ["AVAILABLE", "RESERVED"],
                },
            },
            include: {
                location: true,
                product: true,
                warehouse: true,
            },
            orderBy: { expiryDate: "asc" },
        });

        return items.map((item) => ({
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
        }));
    });

const updateExpiryStatusSchema = z.object({
    notes: z.string().max(500).nullable().optional(),
    operation: z.enum(["QUARANTINE", "DISPOSE", "RELEASE"]),
    stockItemId: z.string().min(1),
});

const hasPermissionForOperation = (
    roleCheck: (permission: AppPermission) => boolean,
    operation: "QUARANTINE" | "DISPOSE" | "RELEASE"
): boolean => {
    if (operation === "QUARANTINE") {
        return roleCheck(PERMISSIONS.INVENTORY_QUARANTINE_MOVE);
    }
    if (operation === "DISPOSE") {
        return roleCheck(PERMISSIONS.INVENTORY_QUARANTINE_DISPOSE);
    }
    return roleCheck(PERMISSIONS.INVENTORY_QUARANTINE_RELEASE);
};

const toTargetStatus = (
    operation: "QUARANTINE" | "DISPOSE" | "RELEASE"
): StockStatus => {
    if (operation === "QUARANTINE") {
        return "QUARANTINE";
    }
    if (operation === "DISPOSE") {
        return "DAMAGED";
    }
    return "AVAILABLE";
};

export const updateStockExpiryStatus = createServerFn({ method: "POST" })
    .inputValidator(updateExpiryStatusSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const canPerform = hasPermissionForOperation(
            (permission) => canUser(context.session.user, permission),
            data.operation
        );
        if (!canPerform) {
            throw new Error("You do not have permission for this operation.");
        }

        const stockItem = await prisma.stockItem.findUnique({
            where: { id: data.stockItemId },
        });
        if (!stockItem) {
            throw new Error("Stock item not found.");
        }

        const targetStatus = toTargetStatus(data.operation);
        const numberingPrefixes = await getNumberingPrefixes();
        const transactionNumber = generateInventoryTransactionNumber(
            numberingPrefixes.inventoryTransaction
        );
        const updated = await prisma.stockItem.update({
            where: { id: stockItem.id },
            data: { status: targetStatus },
        });

        await prisma.stockMovement.create({
            data: {
                batchNumber: stockItem.batchNumber,
                createdById: context.session.user.id,
                fromWarehouseId: stockItem.warehouseId,
                movementNumber: generateStockMovementNumber(
                    numberingPrefixes.stockMovement,
                    transactionNumber,
                    1
                ),
                productId: stockItem.productId,
                quantity: toNumber(stockItem.quantity),
                reason:
                    data.notes ??
                    `Expiry operation: ${data.operation.toLowerCase()}`,
                referenceNumber: data.operation,
                serialNumber: stockItem.serialNumber,
                toWarehouseId: stockItem.warehouseId,
                type: "ADJUSTMENT",
            },
        });

        await logActivity({
            action: "EXPIRY_STOCK_STATUS_UPDATED",
            actorUserId: context.session.user.id,
            changes: {
                after: { operation: data.operation, status: targetStatus },
                before: { status: stockItem.status },
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
