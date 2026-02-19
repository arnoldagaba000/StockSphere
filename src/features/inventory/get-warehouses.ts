import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const getWarehouses = createServerFn({ method: "GET" })
    .inputValidator((input: { includeInactive?: boolean }) => input)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.WAREHOUSES_VIEW_LIST)) {
            throw new Error("You do not have permission to view warehouses.");
        }

        return await prisma.warehouse.findMany({
            where: {
                deletedAt: null,
                ...(!data.includeInactive && { isActive: true }),
            },
            orderBy: { name: "asc" },
            include: { _count: { select: { locations: true } } },
        });
    });
