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
    reassignChildCategoriesTo: z.string().cuid().nullable().optional(),
    reassignProductsTo: z.string().cuid().nullable().optional(),
});

const getDescendantCategoryIds = async (
    categoryId: string
): Promise<Set<string>> => {
    const descendantIds = new Set<string>();
    const queue = [categoryId];

    while (queue.length > 0) {
        const currentCategoryId = queue.shift();
        if (!currentCategoryId) {
            continue;
        }

        const children = await prisma.category.findMany({
            select: { id: true },
            where: {
                deletedAt: null,
                parentId: currentCategoryId,
            },
        });

        for (const child of children) {
            if (!descendantIds.has(child.id)) {
                descendantIds.add(child.id);
                queue.push(child.id);
            }
        }
    }

    return descendantIds;
};

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

        const [productsCount, childCategoriesCount] = await Promise.all([
            prisma.product.count({
                where: {
                    categoryId: data.id,
                    deletedAt: null,
                },
            }),
            prisma.category.count({
                where: {
                    deletedAt: null,
                    parentId: data.id,
                },
            }),
        ]);

        const hasProductDependencies = productsCount > 0;
        const hasChildDependencies = childCategoriesCount > 0;

        if (hasProductDependencies && !data.reassignProductsTo) {
            throw new Error(
                `Category has ${productsCount} active product(s). Reassign products before deleting.`
            );
        }

        if (hasChildDependencies && !data.reassignChildCategoriesTo) {
            throw new Error(
                `Category has ${childCategoriesCount} child category(ies). Reassign children before deleting.`
            );
        }

        if (
            data.reassignProductsTo &&
            data.reassignProductsTo === existingCategory.id
        ) {
            throw new Error(
                "Products cannot be reassigned to the same category being deleted."
            );
        }

        if (
            data.reassignChildCategoriesTo &&
            data.reassignChildCategoriesTo === existingCategory.id
        ) {
            throw new Error(
                "Child categories cannot be reassigned to the same category being deleted."
            );
        }

        if (data.reassignProductsTo || data.reassignChildCategoriesTo) {
            const reassignmentTargets = [
                data.reassignProductsTo,
                data.reassignChildCategoriesTo,
            ].filter(Boolean) as string[];
            const targets = await prisma.category.findMany({
                select: { id: true },
                where: {
                    deletedAt: null,
                    id: {
                        in: reassignmentTargets,
                    },
                },
            });
            if (targets.length !== reassignmentTargets.length) {
                throw new Error(
                    "One or more reassignment target categories were not found."
                );
            }
        }

        if (data.reassignChildCategoriesTo) {
            const descendantIds = await getDescendantCategoryIds(
                existingCategory.id
            );
            if (descendantIds.has(data.reassignChildCategoriesTo)) {
                throw new Error(
                    "Cannot reassign child categories to a descendant of the category being deleted."
                );
            }
        }

        const category = await prisma.$transaction(async (transaction) => {
            if (data.reassignProductsTo) {
                await transaction.product.updateMany({
                    data: {
                        categoryId: data.reassignProductsTo,
                    },
                    where: {
                        categoryId: data.id,
                        deletedAt: null,
                    },
                });
            }

            if (data.reassignChildCategoriesTo) {
                await transaction.category.updateMany({
                    data: {
                        parentId: data.reassignChildCategoriesTo,
                    },
                    where: {
                        deletedAt: null,
                        parentId: data.id,
                    },
                });
            }

            return transaction.category.update({
                data: {
                    deletedAt: new Date(),
                    isActive: false,
                },
                where: {
                    id: data.id,
                },
            });
        });

        await logActivity({
            action: "CATEGORY_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                before: toCategoryAuditSnapshot(existingCategory),
                childCategoriesReassignedTo:
                    data.reassignChildCategoriesTo ?? null,
                productsReassignedTo: data.reassignProductsTo ?? null,
            },
            entity: "Category",
            entityId: category.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            childCategoriesCount,
            productsCount,
            success: true,
        };
    });
