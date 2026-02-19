import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const getCategories = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (!canUser(context.session.user, PERMISSIONS.CATEGORIES_VIEW)) {
            throw new Error("You do not have permission to view categories.");
        }

        return await prisma.category.findMany({
            orderBy: [{ name: "asc" }],
            select: {
                id: true,
                name: true,
                parentId: true,
            },
            where: {
                deletedAt: null,
                isActive: true,
            },
        });
    });
