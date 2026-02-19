import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const updateWarehouseSchema = z.object({
    id: z.string().min(1),
    address: z.string().max(500).nullable().optional(),
    country: z.string().max(100).optional(),
    district: z.string().max(100).nullable().optional(),
    isActive: z.boolean().optional(),
    name: z.string().min(1).max(100).optional(),
    postalCode: z.string().max(30).nullable().optional(),
});

export const updateWarehouse = createServerFn({ method: "POST" })
    .inputValidator(updateWarehouseSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.WAREHOUSES_EDIT)) {
            throw new Error("You do not have permission to edit warehouses.");
        }

        const existing = await prisma.warehouse.findFirst({
            where: { deletedAt: null, id: data.id },
        });
        if (!existing) {
            throw new Error("Warehouse not found.");
        }

        const updated = await prisma.warehouse.update({
            where: { id: data.id },
            data: {
                address: data.address ?? undefined,
                country: data.country ?? undefined,
                district: data.district ?? undefined,
                isActive: data.isActive ?? undefined,
                name: data.name ?? undefined,
                postalCode: data.postalCode ?? undefined,
            },
        });

        await logActivity({
            action: "WAREHOUSE_UPDATED",
            actorUserId: context.session.user.id,
            changes: { before: existing, after: updated },
            entity: "Warehouse",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updated;
    });

const archiveWarehouseSchema = z.object({
    id: z.string().min(1),
});

export const archiveWarehouse = createServerFn({ method: "POST" })
    .inputValidator(archiveWarehouseSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.WAREHOUSES_DEACTIVATE)) {
            throw new Error(
                "You do not have permission to deactivate warehouses."
            );
        }

        const warehouse = await prisma.warehouse.findFirst({
            where: { deletedAt: null, id: data.id },
            include: { _count: { select: { stockItems: true } } },
        });
        if (!warehouse) {
            throw new Error("Warehouse not found.");
        }

        if (warehouse._count.stockItems > 0) {
            throw new Error(
                "Cannot archive a warehouse with stock items. Transfer or adjust stock first."
            );
        }

        const updated = await prisma.warehouse.update({
            where: { id: data.id },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });

        await logActivity({
            action: "WAREHOUSE_ARCHIVED",
            actorUserId: context.session.user.id,
            changes: { before: warehouse, after: updated },
            entity: "Warehouse",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updated;
    });
