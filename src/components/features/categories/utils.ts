interface CategoryItem {
    id: string;
    name: string;
    parentId: string | null;
}

export interface HierarchyCategoryItem {
    depth: number;
    id: string;
    label: string;
    name: string;
    parentId: string | null;
}

const INDENT_MARKER = "— ";

const walkCategoryTree = (
    categoryByParentId: Map<string | null, CategoryItem[]>,
    parentId: string | null,
    depth: number,
    excludedCategoryIds: Set<string>,
    visitedIds: Set<string>,
    output: HierarchyCategoryItem[]
): void => {
    const children = categoryByParentId.get(parentId) ?? [];

    for (const category of children) {
        if (
            visitedIds.has(category.id) ||
            excludedCategoryIds.has(category.id)
        ) {
            continue;
        }

        visitedIds.add(category.id);
        output.push({
            depth,
            id: category.id,
            label: `${INDENT_MARKER.repeat(depth)}${category.name}`,
            name: category.name,
            parentId: category.parentId,
        });

        walkCategoryTree(
            categoryByParentId,
            category.id,
            depth + 1,
            excludedCategoryIds,
            visitedIds,
            output
        );
    }
};

export const buildCategoryHierarchy = (
    categories: CategoryItem[],
    excludedCategoryIds: readonly string[] = []
): HierarchyCategoryItem[] => {
    const categoryByParentId = new Map<string | null, CategoryItem[]>();
    for (const category of categories) {
        const currentItems = categoryByParentId.get(category.parentId) ?? [];
        currentItems.push(category);
        categoryByParentId.set(category.parentId, currentItems);
    }

    for (const groupedCategories of categoryByParentId.values()) {
        groupedCategories.sort((a, b) => a.name.localeCompare(b.name));
    }

    const output: HierarchyCategoryItem[] = [];
    const visitedIds = new Set<string>();
    const excludedIdsSet = new Set(excludedCategoryIds);

    walkCategoryTree(
        categoryByParentId,
        null,
        0,
        excludedIdsSet,
        visitedIds,
        output
    );

    for (const category of categories) {
        if (!(visitedIds.has(category.id) || excludedIdsSet.has(category.id))) {
            output.push({
                depth: 0,
                id: category.id,
                label: category.name,
                name: category.name,
                parentId: category.parentId,
            });
        }
    }

    return output;
};
