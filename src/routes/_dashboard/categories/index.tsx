import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import { buildCategoryHierarchy } from "@/components/features/categories/utils";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { deleteCategory } from "@/features/categories/delete-category";
import { getCategoryAnalytics } from "@/features/categories/get-category-analytics";
import { listCategories } from "@/features/categories/list-categories";

type CategoryListItem = Awaited<ReturnType<typeof listCategories>>[number];
type CategoryAnalyticsItem = Awaited<
    ReturnType<typeof getCategoryAnalytics>
>["categories"][number];

export const Route = createFileRoute("/_dashboard/categories/")({
    component: CategoriesPage,
    loader: async () => {
        const [categories, analytics] = await Promise.all([
            listCategories({ data: { isActive: true } }),
            getCategoryAnalytics(),
        ]);

        return {
            analytics: analytics.categories,
            categories,
        };
    },
});

const toCategoryStatusFilter = (
    nextValue: string | null
): "active" | "inactive" | "all" => {
    if (nextValue === "inactive") {
        return "inactive";
    }

    if (nextValue === "all") {
        return "all";
    }

    return "active";
};

interface CategoriesFiltersProps {
    categories: CategoryListItem[];
    isFiltering: boolean;
    onApplyFilters: () => void;
    onReassignChildrenChange: (value: string) => void;
    onReassignProductsChange: (value: string) => void;
    onSearchChange: (value: string) => void;
    onStatusChange: (value: string | null) => void;
    reassignChildrenTo: string;
    reassignProductsTo: string;
    searchValue: string;
    statusValue: "active" | "inactive" | "all";
}

const CategoriesFilters = ({
    categories,
    isFiltering,
    onApplyFilters,
    onReassignChildrenChange,
    onReassignProductsChange,
    onSearchChange,
    onStatusChange,
    reassignChildrenTo,
    reassignProductsTo,
    searchValue,
    statusValue,
}: CategoriesFiltersProps) => {
    return (
        <>
            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="category-search">Search</Label>
                    <Input
                        id="category-search"
                        onChange={(event) => onSearchChange(event.target.value)}
                        placeholder="Search categories by name"
                        value={searchValue}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select onValueChange={onStatusChange} value={statusValue}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                            <SelectItem value="all">All</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-3">
                    <Button disabled={isFiltering} onClick={onApplyFilters}>
                        {isFiltering ? "Filtering..." : "Apply Filters"}
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Reassign products on archive</Label>
                    <Select
                        onValueChange={(value) =>
                            onReassignProductsChange(value ?? "none")
                        }
                        value={reassignProductsTo}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                Do not reassign
                            </SelectItem>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Reassign child categories on archive</Label>
                    <Select
                        onValueChange={(value) =>
                            onReassignChildrenChange(value ?? "none")
                        }
                        value={reassignChildrenTo}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                Do not reassign
                            </SelectItem>
                            {categories.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>
        </>
    );
};

interface CategoriesTableProps {
    analyticsByCategoryId: Map<string, CategoryAnalyticsItem>;
    categoryById: Map<string, CategoryListItem>;
    deletingCategoryId: string | null;
    handleDeleteCategory: (categoryId: string) => void;
    hierarchicalCategories: ReturnType<typeof buildCategoryHierarchy>;
    parentNameById: Map<string, string>;
}

const CategoriesTable = ({
    analyticsByCategoryId,
    categoryById,
    deletingCategoryId,
    handleDeleteCategory,
    hierarchicalCategories,
    parentNameById,
}: CategoriesTableProps) => {
    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Parent</TableHead>
                        <TableHead>Products</TableHead>
                        <TableHead>Stock Value</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {hierarchicalCategories.length === 0 ? (
                        <TableRow>
                            <TableCell className="text-center" colSpan={6}>
                                No categories found.
                            </TableCell>
                        </TableRow>
                    ) : (
                        hierarchicalCategories.map((item) => {
                            const category = categoryById.get(item.id);
                            if (!category) {
                                return null;
                            }

                            return (
                                <TableRow key={category.id}>
                                    <TableCell className="font-medium">
                                        {item.label}
                                    </TableCell>
                                    <TableCell>
                                        {category.parentId
                                            ? (parentNameById.get(
                                                  category.parentId
                                              ) ?? "Unknown")
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {analyticsByCategoryId.get(category.id)
                                            ?.activeProducts ?? 0}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            analyticsByCategoryId.get(
                                                category.id
                                            )?.estimatedStockValueMinor ?? 0
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                category.isActive
                                                    ? "secondary"
                                                    : "outline"
                                            }
                                        >
                                            {category.isActive
                                                ? "Active"
                                                : "Inactive"}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                render={
                                                    <Link
                                                        params={{
                                                            categoryId:
                                                                category.id,
                                                        }}
                                                        to="/categories/$categoryId"
                                                    />
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                disabled={
                                                    deletingCategoryId ===
                                                        category.id ||
                                                    !category.isActive
                                                }
                                                onClick={() =>
                                                    handleDeleteCategory(
                                                        category.id
                                                    )
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                {deletingCategoryId ===
                                                category.id
                                                    ? "Saving..."
                                                    : "Archive"}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>
        </div>
    );
};

interface CategoriesPageState {
    deletingCategoryId: string | null;
    filteredCategories: Awaited<ReturnType<typeof listCategories>> | null;
    isFiltering: boolean;
    reassignChildrenTo: string;
    reassignProductsTo: string;
    searchValue: string;
    statusValue: "active" | "inactive" | "all";
}

const categoriesPageReducer = (
    state: CategoriesPageState,
    patch: Partial<CategoriesPageState>
): CategoriesPageState => ({
    ...state,
    ...patch,
});

function CategoriesPage() {
    const router = useRouter();
    const { categories, analytics } = Route.useLoaderData();
    const [state, patchState] = useReducer(categoriesPageReducer, {
        deletingCategoryId: null,
        filteredCategories: null,
        isFiltering: false,
        reassignChildrenTo: "none",
        reassignProductsTo: "none",
        searchValue: "",
        statusValue: "active",
    });
    const {
        deletingCategoryId,
        filteredCategories,
        isFiltering,
        reassignChildrenTo,
        reassignProductsTo,
        searchValue,
        statusValue,
    } = state;
    const visibleCategories = filteredCategories ?? categories;

    const parentNameById = useMemo(
        () =>
            new Map(categories.map((category) => [category.id, category.name])),
        [categories]
    );
    const hierarchicalCategories = buildCategoryHierarchy(
        visibleCategories.map((category) => ({
            id: category.id,
            name: category.name,
            parentId: category.parentId,
        }))
    );
    const categoryById = new Map(
        visibleCategories.map((category) => [category.id, category])
    );
    const analyticsByCategoryId = new Map(
        analytics.map((item) => [item.categoryId, item])
    );

    const applyFilters = async () => {
        const isActiveFilter =
            statusValue === "all" ? undefined : statusValue === "active";

        try {
            patchState({ isFiltering: true });
            const response = await listCategories({
                data: {
                    isActive: isActiveFilter,
                    search: searchValue,
                },
            });
            patchState({
                filteredCategories: response,
                isFiltering: false,
            });
        } catch (error) {
            patchState({ isFiltering: false });
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch categories.";
            toast.error(message);
        }
    };

    const handleDeleteCategory = async (categoryId: string) => {
        const reassignChildCategoriesToValue =
            reassignChildrenTo === "none" ? null : reassignChildrenTo;
        const reassignProductsToValue =
            reassignProductsTo === "none" ? null : reassignProductsTo;

        try {
            patchState({ deletingCategoryId: categoryId });
            await deleteCategory({
                data: {
                    id: categoryId,
                    reassignChildCategoriesTo: reassignChildCategoriesToValue,
                    reassignProductsTo: reassignProductsToValue,
                },
            });
            toast.success("Category archived.");
            await router.invalidate();
            patchState({ deletingCategoryId: null });
        } catch (error) {
            patchState({ deletingCategoryId: null });
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to archive category.";
            toast.error(message);
        }
    };

    return (
        <section className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="font-semibold text-2xl">Categories</h1>
                    <p className="text-muted-foreground text-sm">
                        Organize product grouping and hierarchy.
                    </p>
                </div>
                <Button
                    nativeButton={false}
                    render={<Link to="/categories/new" />}
                >
                    New Category
                </Button>
            </div>
            <CategoriesFilters
                categories={categories}
                isFiltering={isFiltering}
                onApplyFilters={applyFilters}
                onReassignChildrenChange={(value) =>
                    patchState({ reassignChildrenTo: value })
                }
                onReassignProductsChange={(value) =>
                    patchState({ reassignProductsTo: value })
                }
                onSearchChange={(value) => patchState({ searchValue: value })}
                onStatusChange={(value) =>
                    patchState({ statusValue: toCategoryStatusFilter(value) })
                }
                reassignChildrenTo={reassignChildrenTo}
                reassignProductsTo={reassignProductsTo}
                searchValue={searchValue}
                statusValue={statusValue}
            />
            <CategoriesTable
                analyticsByCategoryId={analyticsByCategoryId}
                categoryById={categoryById}
                deletingCategoryId={deletingCategoryId}
                handleDeleteCategory={handleDeleteCategory}
                hierarchicalCategories={hierarchicalCategories}
                parentNameById={parentNameById}
            />
        </section>
    );
}
