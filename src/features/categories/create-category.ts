import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import {
    assertCategoryParentExists,
    toCategoryAuditSnapshot,
} from "@/features/categories/category-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { categorySchema } from "@/schemas/category-schema";

export const createCategory = createServerFn({ method: "POST" })
    .inputValidator(categorySchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CATEGORIES_CREATE)) {
            throw new Error("You do not have permission to create categories.");
        }

        await assertCategoryParentExists(data.parentId);

        const category = await prisma.category.create({
            data: {
                description: data.description ?? null,
                name: data.name,
                parentId: data.parentId ?? null,
            },
        });

        await logActivity({
            action: "CATEGORY_CREATED",
            actorUserId: context.session.user.id,
            changes: {
                after: toCategoryAuditSnapshot(category),
            },
            entity: "Category",
            entityId: category.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return category;
    });
