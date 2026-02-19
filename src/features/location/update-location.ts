import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import type { LocationType } from "@/generated/prisma/client";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const updateLocationSchema = z.object({
    id: z.string().min(1),
    isActive: z.boolean().optional(),
    name: z.string().min(1).max(100).optional(),
    type: z
        .enum([
            "STANDARD",
            "QUARANTINE",
            "DAMAGED",
            "RETURNS",
            "STAGING",
        ] as const)
        .optional(),
});

export const updateLocation = createServerFn({ method: "POST" })
    .inputValidator(updateLocationSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.LOCATIONS_EDIT)) {
            throw new Error("You do not have permission to edit locations.");
        }

        const existing = await prisma.location.findFirst({
            where: { deletedAt: null, id: data.id },
        });
        if (!existing) {
            throw new Error("Location not found.");
        }

        const updateData: {
            isActive?: boolean;
            name?: string;
            type?: LocationType;
        } = {
            isActive: data.isActive ?? undefined,
            name: data.name ?? undefined,
            type: data.type ?? undefined,
        };

        if (
            data.type &&
            !canUser(context.session.user, PERMISSIONS.LOCATIONS_SET_TYPE)
        ) {
            throw new Error(
                "You do not have permission to change location type."
            );
        }

        const updated = await prisma.location.update({
            where: { id: data.id },
            data: updateData,
        });

        await logActivity({
            action: "LOCATION_UPDATED",
            actorUserId: context.session.user.id,
            changes: { before: existing, after: updated },
            entity: "Location",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updated;
    });

const archiveLocationSchema = z.object({
    id: z.string().min(1),
});

export const archiveLocation = createServerFn({ method: "POST" })
    .inputValidator(archiveLocationSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.LOCATIONS_DEACTIVATE)) {
            throw new Error(
                "You do not have permission to deactivate locations."
            );
        }

        const location = await prisma.location.findFirst({
            where: { deletedAt: null, id: data.id },
            include: { _count: { select: { stockItems: true } } },
        });
        if (!location) {
            throw new Error("Location not found.");
        }

        if (location._count.stockItems > 0) {
            throw new Error(
                "Cannot archive location with stock items. Move stock first."
            );
        }

        const updated = await prisma.location.update({
            where: { id: data.id },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });

        await logActivity({
            action: "LOCATION_ARCHIVED",
            actorUserId: context.session.user.id,
            changes: { before: location, after: updated },
            entity: "Location",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updated;
    });
