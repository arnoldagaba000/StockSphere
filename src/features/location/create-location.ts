import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { locationSchema } from "@/schemas/location-schema";

export const createLocation = createServerFn({ method: "POST" })
    .inputValidator(locationSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.LOCATIONS_CREATE)) {
            throw new Error("You do not have permission to create locations.");
        }

        const warehouse = await prisma.warehouse.findFirst({
            where: {
                deletedAt: null,
                id: data.warehouseId,
            },
        });
        if (!warehouse) {
            throw new Error("Warehouse not found.");
        }

        const existing = await prisma.location.findUnique({
            where: { code: data.code },
        });
        if (existing) {
            throw new Error(
                `A location with code "${data.code}" already exists.`
            );
        }

        const location = await prisma.location.create({
            data: {
                code: data.code,
                isActive: data.isActive,
                name: data.name,
                type: data.type,
                warehouseId: data.warehouseId,
            },
        });

        await logActivity({
            action: "LOCATION_CREATED",
            actorUserId: context.session.user.id,
            changes: { after: location },
            entity: "Location",
            entityId: location.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return location;
    });
