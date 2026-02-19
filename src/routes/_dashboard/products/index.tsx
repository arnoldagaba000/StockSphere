import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import {
    buildCategoryHierarchy,
    formatCurrencyFromMinorUnits,
} from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { getCategories } from "@/features/categories/get-categories";
import { bulkUpdateProducts } from "@/features/products/bulk-update-products";
import { deleteProduct } from "@/features/products/delete-product";
import { exportProductsCsv } from "@/features/products/export-products-csv";
import { getProductAnalytics } from "@/features/products/get-product-analytics";
import { getProducts } from "@/features/products/get-products";

type ProductListItem = Awaited<
    ReturnType<typeof getProducts>
>["products"][number];
type CategoryListItem = Awaited<ReturnType<typeof getCategories>>[number];

type TrackingFilter = "all" | "no" | "yes";
type ProductStatusFilter = "active" | "all" | "inactive";
type BulkAction = "activate" | "assignCategory" | "exportCsv" | "markInactive";

interface ProductsLoaderData {
    analytics: Awaited<ReturnType<typeof getProductAnalytics>>;
    categories: CategoryListItem[];
    products: ProductListItem[];
}

const trackingFilterToBoolean = (
    filter: TrackingFilter
): boolean | undefined => {
    if (filter === "yes") {
        return true;
    }

    if (filter === "no") {
        return false;
    }

    return undefined;
};

const toStatusFilter = (value: string | null): ProductStatusFilter => {
    if (value === "inactive") {
        return "inactive";
    }

    if (value === "all") {
        return "all";
    }

    return "active";
};

const toTrackingFilter = (value: string | null): TrackingFilter => {
    if (value === "yes") {
        return "yes";
    }

    if (value === "no") {
        return "no";
    }

    return "all";
};

const toBulkAction = (value: string | null): BulkAction => {
    if (value === "activate") {
        return "activate";
    }

    if (value === "assignCategory") {
        return "assignCategory";
    }

    if (value === "exportCsv") {
        return "exportCsv";
    }

    return "markInactive";
};

export const Route = createFileRoute("/_dashboard/products/")({
    component: ProductsPage,
    loader: async (): Promise<ProductsLoaderData> => {
        const [productsResponse, categories, analytics] = await Promise.all([
            getProducts({
                data: {},
            }),
            getCategories(),
            getProductAnalytics(),
        ]);

        return {
            analytics,
            categories,
            products: productsResponse.products,
        };
    },
});

const triggerBrowserDownload = (filename: string, content: string): void => {
    const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
};

function ProductsPage() {
    const router = useRouter();
    const { analytics, categories, products } = Route.useLoaderData();
    const [filteredProducts, setFilteredProducts] = useState<
        ProductListItem[] | null
    >(null);
    const visibleProducts = filteredProducts ?? products;
    const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
    const [searchValue, setSearchValue] = useState("");
    const [statusValue, setStatusValue] =
        useState<ProductStatusFilter>("active");
    const [categoryValue, setCategoryValue] = useState<string>("all");
    const [includeDescendants, setIncludeDescendants] = useState(true);
    const [minPriceValue, setMinPriceValue] = useState("");
    const [maxPriceValue, setMaxPriceValue] = useState("");
    const [trackingBatchValue, setTrackingBatchValue] =
        useState<TrackingFilter>("all");
    const [trackingSerialValue, setTrackingSerialValue] =
        useState<TrackingFilter>("all");
    const [trackingExpiryValue, setTrackingExpiryValue] =
        useState<TrackingFilter>("all");
    const [bulkAction, setBulkAction] = useState<BulkAction>("markInactive");
    const [bulkCategoryId, setBulkCategoryId] = useState("none");
    const [isFiltering, setIsFiltering] = useState(false);
    const [isBulkRunning, setIsBulkRunning] = useState(false);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(
        null
    );
    const categoryOptions = buildCategoryHierarchy(categories);
    const categoryNameById = useMemo(
        () =>
            new Map(categories.map((category) => [category.id, category.name])),
        [categories]
    );

    const selectedProductsCount = selectedProductIds.length;
    const allVisibleSelected =
        visibleProducts.length > 0 &&
        visibleProducts.every((product) =>
            selectedProductIds.includes(product.id)
        );

    const applyFilters = async () => {
        const categoryIdValue =
            categoryValue === "all" ? undefined : categoryValue;
        const isActiveValue =
            statusValue === "all" ? undefined : statusValue === "active";
        const maxSellingPriceValue =
            maxPriceValue.trim().length > 0 ? Number(maxPriceValue) : undefined;
        const minSellingPriceValue =
            minPriceValue.trim().length > 0 ? Number(minPriceValue) : undefined;

        try {
            setIsFiltering(true);
            const response = await getProducts({
                data: {
                    categoryId: categoryIdValue,
                    includeDescendantCategories: includeDescendants,
                    isActive: isActiveValue,
                    maxSellingPrice: maxSellingPriceValue,
                    minSellingPrice: minSellingPriceValue,
                    search: searchValue,
                    trackByBatch: trackingFilterToBoolean(trackingBatchValue),
                    trackByExpiry: trackingFilterToBoolean(trackingExpiryValue),
                    trackBySerialNumber:
                        trackingFilterToBoolean(trackingSerialValue),
                },
            });
            setFilteredProducts(response.products);
            setSelectedProductIds([]);
            setIsFiltering(false);
        } catch (error) {
            setIsFiltering(false);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch products.";
            toast.error(message);
        }
    };

    const handleSoftDelete = async (productId: string) => {
        try {
            setDeletingProductId(productId);
            await deleteProduct({
                data: {
                    hardDelete: false,
                    id: productId,
                },
            });
            toast.success("Product marked inactive.");
            await router.invalidate();
            setDeletingProductId(null);
        } catch (error) {
            setDeletingProductId(null);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to mark product inactive.";
            toast.error(message);
        }
    };

    const runBulkAction = async () => {
        if (selectedProductIds.length === 0) {
            toast.error("Select at least one product.");
            return;
        }
        const categoryIdValue =
            bulkAction === "assignCategory" && bulkCategoryId !== "none"
                ? bulkCategoryId
                : undefined;
        const needsCategorySelection =
            bulkAction === "assignCategory" && bulkCategoryId === "none";

        try {
            setIsBulkRunning(true);

            if (bulkAction === "exportCsv") {
                const exportResult = await exportProductsCsv({
                    data: {
                        productIds: selectedProductIds,
                    },
                });
                triggerBrowserDownload(exportResult.filename, exportResult.csv);
                toast.success("Product CSV exported.");
                setIsBulkRunning(false);
                return;
            }

            if (needsCategorySelection) {
                toast.error("Select a target category for assignment.");
                setIsBulkRunning(false);
                return;
            }

            const response = await bulkUpdateProducts({
                data: {
                    action: bulkAction,
                    categoryId: categoryIdValue,
                    productIds: selectedProductIds,
                },
            });
            toast.success(`Updated ${response.affectedCount} product(s).`);
            setSelectedProductIds([]);
            await router.invalidate();
            setIsBulkRunning(false);
        } catch (error) {
            setIsBulkRunning(false);
            const message =
                error instanceof Error ? error.message : "Bulk action failed.";
            toast.error(message);
        }
    };

    return (
        <section className="w-full space-y-4">
            <div className="grid gap-3 md:grid-cols-4">
                <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">
                        Total Products
                    </p>
                    <p className="font-semibold text-2xl">
                        {analytics.totalProducts}
                    </p>
                </div>
                <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">Active</p>
                    <p className="font-semibold text-2xl">
                        {analytics.activeProducts}
                    </p>
                </div>
                <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">Inactive</p>
                    <p className="font-semibold text-2xl">
                        {analytics.inactiveProducts}
                    </p>
                </div>
                <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground text-xs">
                        Estimated Stock Value
                    </p>
                    <p className="font-semibold text-2xl">
                        {formatCurrencyFromMinorUnits(
                            analytics.stockValueMinor
                        )}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="font-semibold text-2xl">Products</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage your catalog and inventory metadata.
                    </p>
                </div>
                <Button
                    nativeButton={false}
                    render={<Link to="/products/new" />}
                >
                    New Product
                </Button>
            </div>

            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="product-search">Search</Label>
                    <Input
                        id="product-search"
                        onChange={(event) => setSearchValue(event.target.value)}
                        placeholder="Search by SKU, name, or barcode"
                        value={searchValue}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select
                        onValueChange={(value) =>
                            setStatusValue(toStatusFilter(value))
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
                <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                        onValueChange={(nextValue) =>
                            setCategoryValue(nextValue ?? "all")
                        }
                        value={categoryValue}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All categories</SelectItem>
                            {categoryOptions.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Min Selling Price</Label>
                    <Input
                        min={0}
                        onChange={(event) =>
                            setMinPriceValue(event.target.value)
                        }
                        step={1}
                        type="number"
                        value={minPriceValue}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Max Selling Price</Label>
                    <Input
                        min={0}
                        onChange={(event) =>
                            setMaxPriceValue(event.target.value)
                        }
                        step={1}
                        type="number"
                        value={maxPriceValue}
                    />
                </div>
                <div className="space-y-2">
                    <Label>Track By Batch</Label>
                    <Select
                        onValueChange={(value) =>
                            setTrackingBatchValue(toTrackingFilter(value))
                        }
                        value={trackingBatchValue}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Track By Serial</Label>
                    <Select
                        onValueChange={(value) =>
                            setTrackingSerialValue(toTrackingFilter(value))
                        }
                        value={trackingSerialValue}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Track By Expiry</Label>
                    <Select
                        onValueChange={(value) =>
                            setTrackingExpiryValue(toTrackingFilter(value))
                        }
                        value={trackingExpiryValue}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All</SelectItem>
                            <SelectItem value="yes">Yes</SelectItem>
                            <SelectItem value="no">No</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="md:col-span-4">
                    <Label className="mb-2 block">Category Filter Scope</Label>
                    <div className="flex items-center gap-2">
                        <Checkbox
                            checked={includeDescendants}
                            onCheckedChange={(checked) =>
                                setIncludeDescendants(Boolean(checked))
                            }
                        />
                        <span className="text-sm">
                            Include descendant categories
                        </span>
                    </div>
                </div>
                <div className="md:col-span-4">
                    <Button disabled={isFiltering} onClick={applyFilters}>
                        {isFiltering ? "Filtering..." : "Apply Filters"}
                    </Button>
                </div>
            </div>

            <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
                <div className="space-y-2 md:col-span-2">
                    <Label>Bulk Action</Label>
                    <Select
                        onValueChange={(value) =>
                            setBulkAction(toBulkAction(value))
                        }
                        value={bulkAction}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="markInactive">
                                Mark Inactive
                            </SelectItem>
                            <SelectItem value="activate">Activate</SelectItem>
                            <SelectItem value="assignCategory">
                                Assign Category
                            </SelectItem>
                            <SelectItem value="exportCsv">
                                Export CSV
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                    <Label>Target Category (assign only)</Label>
                    <Select
                        onValueChange={(value) =>
                            setBulkCategoryId(value ?? "none")
                        }
                        value={bulkCategoryId}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="none">
                                Select category
                            </SelectItem>
                            {categoryOptions.map((category) => (
                                <SelectItem
                                    key={category.id}
                                    value={category.id}
                                >
                                    {category.label}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex items-center gap-2 md:col-span-4">
                    <Button
                        disabled={isBulkRunning || selectedProductsCount === 0}
                        onClick={runBulkAction}
                    >
                        {isBulkRunning
                            ? "Running..."
                            : `Run Bulk Action (${selectedProductsCount})`}
                    </Button>
                    <span className="text-muted-foreground text-sm">
                        Selected: {selectedProductsCount}
                    </span>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead className="w-10">
                                <Checkbox
                                    checked={allVisibleSelected}
                                    onCheckedChange={(checked) =>
                                        setSelectedProductIds(
                                            checked
                                                ? visibleProducts.map(
                                                      (product) => product.id
                                                  )
                                                : []
                                        )
                                    }
                                />
                            </TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Category</TableHead>
                            <TableHead>Selling Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">
                                Actions
                            </TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {visibleProducts.length === 0 ? (
                            <TableRow>
                                <TableCell className="text-center" colSpan={7}>
                                    No products found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleProducts.map((product) => (
                                <TableRow key={product.id}>
                                    <TableCell>
                                        <Checkbox
                                            checked={selectedProductIds.includes(
                                                product.id
                                            )}
                                            onCheckedChange={(checked) =>
                                                setSelectedProductIds(
                                                    (currentIds) =>
                                                        checked
                                                            ? [
                                                                  ...currentIds,
                                                                  product.id,
                                                              ]
                                                            : currentIds.filter(
                                                                  (id) =>
                                                                      id !==
                                                                      product.id
                                                              )
                                                )
                                            }
                                        />
                                    </TableCell>
                                    <TableCell className="font-medium">
                                        {product.name}
                                    </TableCell>
                                    <TableCell>{product.sku}</TableCell>
                                    <TableCell>
                                        {product.categoryId
                                            ? (categoryNameById.get(
                                                  product.categoryId
                                              ) ?? "Unknown")
                                            : "—"}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            product.sellingPrice
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            variant={
                                                product.isActive
                                                    ? "secondary"
                                                    : "outline"
                                            }
                                        >
                                            {product.isActive
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
                                                            productId:
                                                                product.id,
                                                        }}
                                                        to="/products/$productId"
                                                    />
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                Edit
                                            </Button>
                                            <Button
                                                disabled={
                                                    deletingProductId ===
                                                        product.id ||
                                                    !product.isActive
                                                }
                                                onClick={() =>
                                                    handleSoftDelete(product.id)
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                {deletingProductId ===
                                                product.id
                                                    ? "Saving..."
                                                    : "Mark Inactive"}
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </section>
    );
}
