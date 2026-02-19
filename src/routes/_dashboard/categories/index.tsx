import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
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

function CategoriesPage() {
    const router = useRouter();
    const { categories, analytics } = Route.useLoaderData();
    const [filteredCategories, setFilteredCategories] = useState<
        typeof categories | null
    >(null);
    const visibleCategories = filteredCategories ?? categories;
    const [searchValue, setSearchValue] = useState("");
    const [statusValue, setStatusValue] = useState<
        "active" | "inactive" | "all"
    >("active");
    const [isFiltering, setIsFiltering] = useState(false);
    const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(
        null
    );
    const [reassignProductsTo, setReassignProductsTo] =
        useState<string>("none");
    const [reassignChildrenTo, setReassignChildrenTo] =
        useState<string>("none");

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
            setIsFiltering(true);
            const response = await listCategories({
                data: {
                    isActive: isActiveFilter,
                    search: searchValue,
                },
            });
            setFilteredCategories(response);
            setIsFiltering(false);
        } catch (error) {
            setIsFiltering(false);
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
            setDeletingCategoryId(categoryId);
            await deleteCategory({
                data: {
                    id: categoryId,
                    reassignChildCategoriesTo: reassignChildCategoriesToValue,
                    reassignProductsTo: reassignProductsToValue,
                },
            });
            toast.success("Category archived.");
            await router.invalidate();
            setDeletingCategoryId(null);
        } catch (error) {
            setDeletingCategoryId(null);
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

            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-3">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="category-search">Search</Label>
                    <Input
                        id="category-search"
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search categories by name"
                        value={searchValue}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                        onValueChange={(nextValue) =>
                            setStatusValue(toCategoryStatusFilter(nextValue))
                        }
                        value={statusValue}
                    >
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
                    <Button disabled={isFiltering} onClick={applyFilters}>
                        {isFiltering ? "Filtering..." : "Apply Filters"}
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-2">
                <div className="space-y-2">
                    <Label>Reassign products on archive</Label>
                    <Select
                        onValueChange={(value) =>
                            setReassignProductsTo(value ?? "none")
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
                            setReassignChildrenTo(value ?? "none")
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

            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Parent</TableHead>
                            <TableHead>Products</TableHead>
                            <TableHead>Stock Value</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
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
                                            {analyticsByCategoryId.get(
                                                category.id
                                            )?.activeProducts ?? 0}
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
        </section>
    );
}
