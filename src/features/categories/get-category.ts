import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getCategoryInputSchema = z.object({
    id: z.cuid("Invalid category id"),
});

export const getCategory = createServerFn({ method: "GET" })
    .inputValidator(getCategoryInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CATEGORIES_VIEW)) {
            throw new Error("You do not have permission to view categories.");
        }

        const category = await prisma.category.findFirst({
            where: {
                deletedAt: null,
                id: data.id,
            },
        });

        if (!category) {
            throw new Error("Category not found.");
        }

        return category;
    });
