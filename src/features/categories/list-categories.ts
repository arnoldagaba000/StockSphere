import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const listCategoriesInputSchema = z.object({
    isActive: z.boolean().optional(),
    search: z.string().optional(),
});

export const listCategories = createServerFn({ method: "GET" })
    .inputValidator(listCategoriesInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CATEGORIES_VIEW)) {
            throw new Error("You do not have permission to view categories.");
        }

        const search = data.search?.trim();

        return await prisma.category.findMany({
            orderBy: [{ name: "asc" }],
            where: {
                deletedAt: null,
                ...(typeof data.isActive === "boolean"
                    ? { isActive: data.isActive }
                    : {}),
                ...(search
                    ? {
                          name: {
                              contains: search,
                              mode: "insensitive",
                          },
                      }
                    : {}),
            },
        });
    });
