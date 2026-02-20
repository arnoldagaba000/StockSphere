import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
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
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

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
    financialSettings: Awaited<ReturnType<typeof getFinancialSettings>>;
    products: ProductListItem[];
}

interface ProductsPageState {
    bulkAction: BulkAction;
    bulkCategoryId: string;
    categoryValue: string;
    deletingProductId: string | null;
    filteredProducts: ProductListItem[] | null;
    includeDescendants: boolean;
    isBulkRunning: boolean;
    isFiltering: boolean;
    maxPriceValue: string;
    minPriceValue: string;
    searchValue: string;
    selectedProductIds: string[];
    statusValue: ProductStatusFilter;
    trackingBatchValue: TrackingFilter;
    trackingExpiryValue: TrackingFilter;
    trackingSerialValue: TrackingFilter;
}

type ProductsPageAction =
    | Partial<ProductsPageState>
    | ((state: ProductsPageState) => Partial<ProductsPageState>);

const productsPageReducer = (
    state: ProductsPageState,
    action: ProductsPageAction
): ProductsPageState => {
    const patch = typeof action === "function" ? action(state) : action;
    return {
        ...state,
        ...patch,
    };
};

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
        const [
            activeProductsResponse,
            inactiveProductsResponse,
            categories,
            analytics,
            financialSettings,
        ] = await Promise.all([
            getProducts({
                data: { isActive: true },
            }),
            getProducts({
                data: { isActive: false },
            }),
            getCategories(),
            getProductAnalytics(),
            getFinancialSettings(),
        ]);

        const mergedProductsMap = new Map<string, ProductListItem>();
        for (const product of activeProductsResponse.products) {
            mergedProductsMap.set(product.id, product);
        }
        for (const product of inactiveProductsResponse.products) {
            mergedProductsMap.set(product.id, product);
        }

        return {
            analytics,
            categories,
            financialSettings,
            products: [...mergedProductsMap.values()].sort((left, right) =>
                left.name.localeCompare(right.name)
            ),
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

interface ProductMetricsProps {
    analytics: ProductsLoaderData["analytics"];
    currencyCode: string;
}

const ProductMetrics = ({ analytics, currencyCode }: ProductMetricsProps) => {
    return (
        <div className="grid gap-3 md:grid-cols-4">
            <div className="rounded-lg border p-3">
                <p className="text-muted-foreground text-xs">Total Products</p>
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
                        analytics.stockValueMinor,
                        currencyCode
                    )}
                </p>
            </div>
        </div>
    );
};

const ProductsHeader = () => {
    return (
        <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
                <h1 className="font-semibold text-2xl">Products</h1>
                <p className="text-muted-foreground text-sm">
                    Manage your catalog and inventory metadata.
                </p>
            </div>
            <Button nativeButton={false} render={<Link to="/products/new" />}>
                New Product
            </Button>
        </div>
    );
};

interface ProductFiltersProps {
    applyFilters: () => void;
    categoryOptions: ReturnType<typeof buildCategoryHierarchy>;
    categoryValue: string;
    includeDescendants: boolean;
    isFiltering: boolean;
    maxPriceValue: string;
    minPriceValue: string;
    searchValue: string;
    setState: (action: ProductsPageAction) => void;
    statusValue: ProductStatusFilter;
    trackingBatchValue: TrackingFilter;
    trackingExpiryValue: TrackingFilter;
    trackingSerialValue: TrackingFilter;
}

const ProductFilters = ({
    applyFilters,
    categoryOptions,
    categoryValue,
    includeDescendants,
    isFiltering,
    maxPriceValue,
    minPriceValue,
    searchValue,
    setState,
    statusValue,
    trackingBatchValue,
    trackingExpiryValue,
    trackingSerialValue,
}: ProductFiltersProps) => {
    return (
        <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="product-search">Search</Label>
                <Input
                    id="product-search"
                    onChange={(event) =>
                        setState({ searchValue: event.target.value })
                    }
                    placeholder="Search by SKU, name, or barcode"
                    value={searchValue}
                />
            </div>
            <div className="space-y-2">
                <Label>Status</Label>
                <Select
                    onValueChange={(value) =>
                        setState({
                            statusValue: toStatusFilter(value),
                        })
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
                        setState({ categoryValue: nextValue ?? "all" })
                    }
                    value={categoryValue}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All categories</SelectItem>
                        {categoryOptions.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
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
                        setState({ minPriceValue: event.target.value })
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
                        setState({ maxPriceValue: event.target.value })
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
                        setState({
                            trackingBatchValue: toTrackingFilter(value),
                        })
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
                        setState({
                            trackingSerialValue: toTrackingFilter(value),
                        })
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
                        setState({
                            trackingExpiryValue: toTrackingFilter(value),
                        })
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
                            setState({
                                includeDescendants: Boolean(checked),
                            })
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
    );
};

interface ProductBulkActionsProps {
    bulkAction: BulkAction;
    bulkCategoryId: string;
    categoryOptions: ReturnType<typeof buildCategoryHierarchy>;
    isBulkRunning: boolean;
    runBulkAction: () => void;
    selectedProductsCount: number;
    setState: (action: ProductsPageAction) => void;
}

const ProductBulkActions = ({
    bulkAction,
    bulkCategoryId,
    categoryOptions,
    isBulkRunning,
    runBulkAction,
    selectedProductsCount,
    setState,
}: ProductBulkActionsProps) => {
    return (
        <div className="grid gap-3 rounded-lg border p-4 md:grid-cols-4">
            <div className="space-y-2 md:col-span-2">
                <Label>Bulk Action</Label>
                <Select
                    onValueChange={(value) =>
                        setState({ bulkAction: toBulkAction(value) })
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
                        <SelectItem value="exportCsv">Export CSV</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label>Target Category (assign only)</Label>
                <Select
                    onValueChange={(value) =>
                        setState({ bulkCategoryId: value ?? "none" })
                    }
                    value={bulkCategoryId}
                >
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">Select category</SelectItem>
                        {categoryOptions.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
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
    );
};

interface ProductTableProps {
    allVisibleSelected: boolean;
    categoryNameById: Map<string, string>;
    currencyCode: string;
    deletingProductId: string | null;
    onSoftDelete: (productId: string) => void;
    selectedProductIds: string[];
    setState: (action: ProductsPageAction) => void;
    visibleProducts: ProductListItem[];
}

const ProductTable = ({
    allVisibleSelected,
    categoryNameById,
    currencyCode,
    deletingProductId,
    onSoftDelete,
    selectedProductIds,
    setState,
    visibleProducts,
}: ProductTableProps) => {
    return (
        <div className="overflow-hidden rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-10">
                            <Checkbox
                                checked={allVisibleSelected}
                                onCheckedChange={(checked) =>
                                    setState({
                                        selectedProductIds: checked
                                            ? visibleProducts.map(
                                                  (product) => product.id
                                              )
                                            : [],
                                    })
                                }
                            />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Selling Price</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
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
                                            setState((currentState) => ({
                                                selectedProductIds: checked
                                                    ? [
                                                          ...currentState.selectedProductIds,
                                                          product.id,
                                                      ]
                                                    : currentState.selectedProductIds.filter(
                                                          (id) =>
                                                              id !== product.id
                                                      ),
                                            }))
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
                                        product.sellingPrice,
                                        currencyCode
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
                                                        productId: product.id,
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
                                                onSoftDelete(product.id)
                                            }
                                            size="sm"
                                            variant="outline"
                                        >
                                            {deletingProductId === product.id
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
    );
};

function ProductsPage() {
    const router = useRouter();
    const { analytics, categories, financialSettings, products } =
        Route.useLoaderData();
    const { currencyCode } = financialSettings;
    const [state, setState] = useReducer(productsPageReducer, {
        bulkAction: "markInactive" as BulkAction,
        bulkCategoryId: "none",
        categoryValue: "all",
        deletingProductId: null,
        filteredProducts: null,
        includeDescendants: true,
        isBulkRunning: false,
        isFiltering: false,
        maxPriceValue: "",
        minPriceValue: "",
        searchValue: "",
        selectedProductIds: [],
        statusValue: "all" as ProductStatusFilter,
        trackingBatchValue: "all" as TrackingFilter,
        trackingExpiryValue: "all" as TrackingFilter,
        trackingSerialValue: "all" as TrackingFilter,
    });
    const {
        bulkAction,
        bulkCategoryId,
        categoryValue,
        deletingProductId,
        filteredProducts,
        includeDescendants,
        isBulkRunning,
        isFiltering,
        maxPriceValue,
        minPriceValue,
        searchValue,
        selectedProductIds,
        statusValue,
        trackingBatchValue,
        trackingExpiryValue,
        trackingSerialValue,
    } = state;
    const visibleProducts = filteredProducts ?? products;
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
            setState({ isFiltering: true });
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
            setState({
                filteredProducts: response.products,
                isFiltering: false,
                selectedProductIds: [],
            });
        } catch (error) {
            setState({ isFiltering: false });
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch products.";
            toast.error(message);
        }
    };

    const handleSoftDelete = async (productId: string) => {
        try {
            setState({ deletingProductId: productId });
            await deleteProduct({
                data: {
                    hardDelete: false,
                    id: productId,
                },
            });
            toast.success("Product marked inactive.");
            await router.invalidate();
            setState({ deletingProductId: null });
        } catch (error) {
            setState({ deletingProductId: null });
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
            setState({ isBulkRunning: true });

            if (bulkAction === "exportCsv") {
                const exportResult = await exportProductsCsv({
                    data: {
                        productIds: selectedProductIds,
                    },
                });
                triggerBrowserDownload(exportResult.filename, exportResult.csv);
                toast.success("Product CSV exported.");
                setState({ isBulkRunning: false });
                return;
            }

            if (needsCategorySelection) {
                toast.error("Select a target category for assignment.");
                setState({ isBulkRunning: false });
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
            setState({ selectedProductIds: [] });
            await router.invalidate();
            setState({ isBulkRunning: false });
        } catch (error) {
            setState({ isBulkRunning: false });
            const message =
                error instanceof Error ? error.message : "Bulk action failed.";
            toast.error(message);
        }
    };

    return (
        <section className="w-full space-y-4">
            <ProductMetrics analytics={analytics} currencyCode={currencyCode} />
            <ProductsHeader />
            <ProductFilters
                applyFilters={() => {
                    applyFilters().catch(() => undefined);
                }}
                categoryOptions={categoryOptions}
                categoryValue={categoryValue}
                includeDescendants={includeDescendants}
                isFiltering={isFiltering}
                maxPriceValue={maxPriceValue}
                minPriceValue={minPriceValue}
                searchValue={searchValue}
                setState={setState}
                statusValue={statusValue}
                trackingBatchValue={trackingBatchValue}
                trackingExpiryValue={trackingExpiryValue}
                trackingSerialValue={trackingSerialValue}
            />
            <ProductBulkActions
                bulkAction={bulkAction}
                bulkCategoryId={bulkCategoryId}
                categoryOptions={categoryOptions}
                isBulkRunning={isBulkRunning}
                runBulkAction={() => {
                    runBulkAction().catch(() => undefined);
                }}
                selectedProductsCount={selectedProductsCount}
                setState={setState}
            />
            <ProductTable
                allVisibleSelected={allVisibleSelected}
                categoryNameById={categoryNameById}
                currencyCode={currencyCode}
                deletingProductId={deletingProductId}
                onSoftDelete={(productId) => {
                    handleSoftDelete(productId).catch(() => undefined);
                }}
                selectedProductIds={selectedProductIds}
                setState={setState}
                visibleProducts={visibleProducts}
            />
        </section>
    );
}
