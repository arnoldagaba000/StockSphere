import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import {
    assertCategoryParentExists,
    assertNoCategoryCycle,
    toCategoryAuditSnapshot,
} from "@/features/categories/category-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { updateCategorySchema } from "@/schemas/category-schema";

export const updateCategory = createServerFn({ method: "POST" })
    .inputValidator(updateCategorySchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CATEGORIES_EDIT)) {
            throw new Error("You do not have permission to update categories.");
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

        await assertCategoryParentExists(data.parentId);
        await assertNoCategoryCycle(data.id, data.parentId);

        const category = await prisma.category.update({
            data: {
                description: data.description,
                name: data.name,
                parentId: data.parentId,
            },
            where: {
                id: data.id,
            },
        });

        await logActivity({
            action: "CATEGORY_UPDATED",
            actorUserId: context.session.user.id,
            changes: {
                after: toCategoryAuditSnapshot(category),
                before: toCategoryAuditSnapshot(existingCategory),
            },
            entity: "Category",
            entityId: category.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return category;
    });
