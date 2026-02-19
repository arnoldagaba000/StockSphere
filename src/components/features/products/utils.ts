interface FlatCategory {
    id: string;
    name: string;
    parentId: string | null;
}

interface HierarchyCategory {
    id: string;
    label: string;
}

const INDENTATION_UNIT = "— ";

const walkCategoryTree = (
    categoryByParentId: Map<string | null, FlatCategory[]>,
    parentId: string | null,
    depth: number,
    visitedIds: Set<string>,
    output: HierarchyCategory[]
): void => {
    const children = categoryByParentId.get(parentId) ?? [];

    for (const category of children) {
        if (visitedIds.has(category.id)) {
            continue;
        }

        visitedIds.add(category.id);
        output.push({
            id: category.id,
            label: `${INDENTATION_UNIT.repeat(depth)}${category.name}`,
        });
        walkCategoryTree(
            categoryByParentId,
            category.id,
            depth + 1,
            visitedIds,
            output
        );
    }
};

export const buildCategoryHierarchy = (
    categories: FlatCategory[]
): HierarchyCategory[] => {
    const categoryByParentId = new Map<string | null, FlatCategory[]>();
    for (const category of categories) {
        const currentItems = categoryByParentId.get(category.parentId) ?? [];
        currentItems.push(category);
        categoryByParentId.set(category.parentId, currentItems);
    }

    for (const groupedCategories of categoryByParentId.values()) {
        groupedCategories.sort((a, b) => a.name.localeCompare(b.name));
    }

    const output: HierarchyCategory[] = [];
    const visitedIds = new Set<string>();
    walkCategoryTree(categoryByParentId, null, 0, visitedIds, output);

    for (const category of categories) {
        if (!visitedIds.has(category.id)) {
            output.push({
                id: category.id,
                label: category.name,
            });
        }
    }

    return output;
};

export const formatCurrencyFromMinorUnits = (
    value: number | null | undefined
): string => {
    if (value == null) {
        return "—";
    }

    return new Intl.NumberFormat("en-US", {
        currency: "USD",
        style: "currency",
    }).format(value / 100);
};
