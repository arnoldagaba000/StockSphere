import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import CategoryForm from "@/components/features/categories/category-form";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { getCategory } from "@/features/categories/get-category";
import { getCategoryAnalytics } from "@/features/categories/get-category-analytics";
import { listCategories } from "@/features/categories/list-categories";
import { updateCategory } from "@/features/categories/update-category";
import { getProducts } from "@/features/products/get-products";
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

const SHORT_ID_LENGTH = 8;

type CategoryList = Awaited<ReturnType<typeof listCategories>>;
type CategoryAnalyticsItem = Awaited<
    ReturnType<typeof getCategoryAnalytics>
>["categories"][number];
type CategoryProductsResponse = Awaited<ReturnType<typeof getProducts>>;
type CategoryEntity = Awaited<ReturnType<typeof getCategory>>;

interface CategoryDetailLoaderData {
    analytics: CategoryAnalyticsItem[];
    categories: CategoryList;
    category: CategoryEntity;
    categoryProducts: CategoryProductsResponse;
    currencyCode: string;
}

const getTrackingSummary = (
    product: CategoryProductsResponse["products"][number]
): string => {
    const tracking: string[] = [];
    if (product.trackByBatch) {
        tracking.push("Batch");
    }
    if (product.trackByExpiry) {
        tracking.push("Expiry");
    }
    if (product.trackBySerialNumber) {
        tracking.push("Serial");
    }

    return tracking.length > 0 ? tracking.join(" · ") : "None";
};

export const Route = createFileRoute("/_dashboard/categories/$categoryId")({
    component: CategoryDetailPage,
    loader: async ({ params }): Promise<CategoryDetailLoaderData> => {
        const [
            categories,
            category,
            analytics,
            categoryProducts,
            financialSettings,
        ] = await Promise.all([
            listCategories({ data: {} }),
            getCategory({
                data: {
                    id: params.categoryId,
                },
            }),
            getCategoryAnalytics(),
            getProducts({
                data: {
                    categoryId: params.categoryId,
                    includeDescendantCategories: true,
                    pageSize: 20,
                },
            }),
            getFinancialSettings(),
        ]);

        return {
            analytics: analytics.categories,
            categories,
            category,
            categoryProducts,
            currencyCode: financialSettings.currencyCode,
        };
    },
});

function CategoryDetailPage() {
    const router = useRouter();
    const { analytics, categories, category, categoryProducts, currencyCode } =
        Route.useLoaderData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    const categoryById = useMemo(
        () => new Map(categories.map((entry) => [entry.id, entry])),
        [categories]
    );
    const analyticsByCategoryId = useMemo(
        () => new Map(analytics.map((entry) => [entry.categoryId, entry])),
        [analytics]
    );
    const parentCategory = category.parentId
        ? (categoryById.get(category.parentId) ?? null)
        : null;
    const childCategories = useMemo(
        () => categories.filter((entry) => entry.parentId === category.id),
        [categories, category.id]
    );
    const categoryAnalytics = analyticsByCategoryId.get(category.id);

    const handleSaveCategory = async (data: {
        description: string;
        name: string;
        parentId: string;
    }): Promise<void> => {
        try {
            setIsSubmitting(true);
            await updateCategory({
                data: {
                    ...data,
                    id: category.id,
                },
            });
            toast.success("Category updated.");
            await router.invalidate();
            setIsSubmitting(false);
        } catch (error) {
            setIsSubmitting(false);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update category.";
            toast.error(message);
        }
    };

    return (
        <section className="w-full space-y-4">
            <CategoryPageHeader name={category.name} />
            <CategorySummaryCards
                category={category}
                categoryAnalytics={categoryAnalytics}
                childCount={childCategories.length}
                currencyCode={currencyCode}
            />
            <CategoryDetailsCard
                category={category}
                parentName={parentCategory?.name}
            />
            <div className="grid gap-4 lg:grid-cols-2">
                <ChildCategoriesCard childCategories={childCategories} />
                <CategoryProductsCard
                    categoryProducts={categoryProducts}
                    currencyCode={currencyCode}
                />
            </div>
            <CategoryEditCard
                categories={categories}
                category={category}
                isSubmitting={isSubmitting}
                onSubmit={handleSaveCategory}
            />
        </section>
    );
}

function CategoryPageHeader({ name }: { name: string }) {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl">{name}</h1>
                <p className="text-muted-foreground text-sm">
                    Category detail view with hierarchy, products, and
                    analytics.
                </p>
            </div>
            <Button
                nativeButton={false}
                render={<Link to="/categories" />}
                variant="outline"
            >
                Back to Categories
            </Button>
        </div>
    );
}

function CategorySummaryCards({
    category,
    categoryAnalytics,
    childCount,
    currencyCode,
}: {
    category: CategoryEntity;
    categoryAnalytics: CategoryAnalyticsItem | undefined;
    childCount: number;
    currencyCode: string;
}) {
    return (
        <div className="grid gap-3 md:grid-cols-4">
            <Card className="border-border/70">
                <CardContent className="space-y-1 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Status
                    </p>
                    <Badge variant={category.isActive ? "secondary" : "ghost"}>
                        {category.isActive ? "Active" : "Inactive"}
                    </Badge>
                </CardContent>
            </Card>
            <Card className="border-border/70">
                <CardContent className="space-y-1 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Child Categories
                    </p>
                    <p className="font-semibold text-2xl">{childCount}</p>
                </CardContent>
            </Card>
            <Card className="border-border/70">
                <CardContent className="space-y-1 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Products
                    </p>
                    <p className="font-semibold text-2xl">
                        {categoryAnalytics?.totalProducts ?? 0}
                    </p>
                    <p className="text-muted-foreground text-xs">
                        Active: {categoryAnalytics?.activeProducts ?? 0}
                    </p>
                </CardContent>
            </Card>
            <Card className="border-border/70">
                <CardContent className="space-y-1 p-4">
                    <p className="text-muted-foreground text-xs uppercase tracking-wide">
                        Stock Value
                    </p>
                    <p className="font-semibold text-xl">
                        {formatCurrencyFromMinorUnits(
                            categoryAnalytics?.estimatedStockValueMinor ?? 0,
                            currencyCode
                        )}
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

function CategoryDetailsCard({
    category,
    parentName,
}: {
    category: CategoryEntity;
    parentName: string | undefined;
}) {
    return (
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle>Category Details</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableBody>
                        <TableRow>
                            <TableCell className="text-muted-foreground">
                                ID
                            </TableCell>
                            <TableCell className="font-mono text-sm">
                                {category.id.slice(0, SHORT_ID_LENGTH)}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-muted-foreground">
                                Parent
                            </TableCell>
                            <TableCell>
                                {parentName ?? "Root category"}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-muted-foreground">
                                Description
                            </TableCell>
                            <TableCell>{category.description ?? "—"}</TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-muted-foreground">
                                Created
                            </TableCell>
                            <TableCell>
                                {new Date(category.createdAt).toLocaleString()}
                            </TableCell>
                        </TableRow>
                        <TableRow>
                            <TableCell className="text-muted-foreground">
                                Updated
                            </TableCell>
                            <TableCell>
                                {new Date(category.updatedAt).toLocaleString()}
                            </TableCell>
                        </TableRow>
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function ChildCategoriesCard({
    childCategories,
}: {
    childCategories: CategoryList;
}) {
    return (
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle>Child Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {childCategories.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        No child categories found.
                    </p>
                ) : (
                    childCategories.map((child) => (
                        <div
                            className="flex items-center justify-between gap-2 rounded-lg border border-border/70 p-3"
                            key={child.id}
                        >
                            <div>
                                <p className="font-medium">{child.name}</p>
                                <p className="text-muted-foreground text-xs">
                                    {child.id.slice(0, SHORT_ID_LENGTH)}
                                </p>
                            </div>
                            <Button
                                nativeButton={false}
                                render={
                                    <Link
                                        params={{
                                            categoryId: child.id,
                                        }}
                                        to="/categories/$categoryId"
                                    />
                                }
                                size="sm"
                                variant="outline"
                            >
                                Open
                            </Button>
                        </div>
                    ))
                )}
            </CardContent>
        </Card>
    );
}

function CategoryProductsCard({
    categoryProducts,
    currencyCode,
}: {
    categoryProducts: CategoryProductsResponse;
    currencyCode: string;
}) {
    return (
        <Card className="border-border/70">
            <CardHeader>
                <CardTitle>
                    Products in Category Tree (Latest{" "}
                    {categoryProducts.products.length})
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
                {categoryProducts.products.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                        No products found in this category.
                    </p>
                ) : (
                    categoryProducts.products.map((product) => (
                        <div
                            className="space-y-1 rounded-lg border border-border/70 p-3"
                            key={product.id}
                        >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">{product.name}</p>
                                <Badge
                                    variant={
                                        product.isActive ? "secondary" : "ghost"
                                    }
                                >
                                    {product.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>
                            <p className="text-muted-foreground text-xs">
                                {product.sku} · Tracking:{" "}
                                {getTrackingSummary(product)}
                            </p>
                            <p className="text-muted-foreground text-xs">
                                Cost:{" "}
                                {formatCurrencyFromMinorUnits(
                                    product.costPrice ?? 0,
                                    currencyCode
                                )}
                                {" · "}
                                Selling:{" "}
                                {formatCurrencyFromMinorUnits(
                                    product.sellingPrice ?? 0,
                                    currencyCode
                                )}
                            </p>
                        </div>
                    ))
                )}
                {categoryProducts.pagination.total >
                categoryProducts.products.length ? (
                    <p className="text-muted-foreground text-xs">
                        Showing {categoryProducts.products.length} of{" "}
                        {categoryProducts.pagination.total} products.
                    </p>
                ) : null}
            </CardContent>
        </Card>
    );
}

function CategoryEditCard({
    categories,
    category,
    isSubmitting,
    onSubmit,
}: {
    categories: CategoryList;
    category: CategoryEntity;
    isSubmitting: boolean;
    onSubmit: (data: {
        description: string;
        name: string;
        parentId: string;
    }) => Promise<void>;
}) {
    return (
        <Card className="w-full rounded-xl border-border/70 shadow-sm">
            <CardHeader className="space-y-1">
                <CardTitle>Edit Category</CardTitle>
            </CardHeader>
            <CardContent>
                <CategoryForm
                    categories={categories}
                    defaultValues={{
                        description: category.description ?? "",
                        name: category.name,
                        parentId: category.parentId ?? "",
                    }}
                    excludeCategoryIds={[category.id]}
                    isSubmitting={isSubmitting}
                    onSubmit={(data) => {
                        onSubmit(data).catch(() => undefined);
                    }}
                    submitLabel="Save Changes"
                />
            </CardContent>
        </Card>
    );
}
