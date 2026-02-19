import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const listSuppliers = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (!canUser(context.session.user, PERMISSIONS.SUPPLIERS_VIEW_LIST)) {
            throw new Error("You do not have permission to view suppliers.");
        }

        return await prisma.supplier.findMany({
            orderBy: [{ name: "asc" }],
            select: {
                id: true,
                name: true,
            },
            where: {
                deletedAt: null,
                isActive: true,
            },
        });
    });
