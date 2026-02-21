import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import type { LocationType } from "@/generated/prisma/client";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const getLocations = createServerFn({ method: "GET" })
    .inputValidator(
        (input: {
            archivedOnly?: boolean;
            includeInactive?: boolean;
            type?: LocationType;
            warehouseId?: string;
        }) => input
    )
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.LOCATIONS_VIEW)) {
            throw new Error("You do not have permission to view locations.");
        }

        return await prisma.location.findMany({
            include: {
                warehouse: {
                    select: {
                        id: true,
                        code: true,
                        name: true,
                    },
                },
            },
            where: {
                ...(data.archivedOnly
                    ? { deletedAt: { not: null } }
                    : { deletedAt: null }),
                ...(data.warehouseId ? { warehouseId: data.warehouseId } : {}),
                ...(!(data.archivedOnly || data.includeInactive) && {
                    isActive: true,
                }),
                ...(data.type && { type: data.type }),
            },
            orderBy: { code: "asc" },
        });
    });
