import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { toCategoryAuditSnapshot } from "@/features/categories/category-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const deleteCategoryInputSchema = z.object({
    id: z.cuid("Invalid category id"),
});

export const deleteCategory = createServerFn({ method: "POST" })
    .inputValidator(deleteCategoryInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CATEGORIES_DELETE)) {
            throw new Error("You do not have permission to delete categories.");
        }

        const existingCategory = await prisma.category.findFirst({
            where: {
                deletedAt: null,
                id: data.id,
            },
        });

        if (!existingCategory) {
            throw new Error("Category not found.");
        }

        const category = await prisma.category.update({
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
            where: {
                id: data.id,
            },
        });

        await logActivity({
            action: "CATEGORY_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                before: toCategoryAuditSnapshot(existingCategory),
            },
            entity: "Category",
            entityId: category.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
