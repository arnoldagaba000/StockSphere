import { prisma } from "@/db";

interface CategoryAuditShape {
    id: string;
    isActive: boolean;
    name: string;
    parentId: string | null;
}

export const toCategoryAuditSnapshot = (
    category: CategoryAuditShape
): Record<string, boolean | string | null> => ({
    id: category.id,
    isActive: category.isActive,
    name: category.name,
    parentId: category.parentId,
});

export const assertCategoryParentExists = async (
    parentId: string | null | undefined
): Promise<void> => {
    if (!parentId) {
        return;
    }

    const parentCategory = await prisma.category.findFirst({
        select: { id: true },
        where: {
            deletedAt: null,
            id: parentId,
            isActive: true,
        },
    });

    if (!parentCategory) {
        throw new Error("Selected parent category does not exist.");
    }
};

export const assertNoCategoryCycle = async (
    categoryId: string,
    parentId: string | null | undefined
): Promise<void> => {
    if (!parentId) {
        return;
    }

    if (categoryId === parentId) {
        throw new Error("A category cannot be its own parent.");
    }

    let currentParentId: string | null = parentId;
    while (currentParentId) {
        if (currentParentId === categoryId) {
            throw new Error("Category hierarchy cannot contain cycles.");
        }

        const parentCategory: { parentId: string | null } | null =
            await prisma.category.findUnique({
                select: { parentId: true },
                where: { id: currentParentId },
            });

        currentParentId = parentCategory?.parentId ?? null;
    }
};
