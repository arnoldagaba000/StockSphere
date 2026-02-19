import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import {
    buildCategoryHierarchy,
    formatCurrencyFromMinorUnits,
} from "@/components/features/products/utils";
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
import { getCategories } from "@/features/categories/get-categories";
import { deleteProduct } from "@/features/products/delete-product";
import { getProducts } from "@/features/products/get-products";

type ProductListItem = Awaited<
    ReturnType<typeof getProducts>
>["products"][number];
type CategoryListItem = Awaited<ReturnType<typeof getCategories>>[number];

interface ProductsLoaderData {
    categories: CategoryListItem[];
    products: ProductListItem[];
}

export const Route = createFileRoute("/_dashboard/products/")({
    component: ProductsPage,
    loader: async (): Promise<ProductsLoaderData> => {
        const [productsResponse, categories] = await Promise.all([
            getProducts({
                data: {},
            }),
            getCategories(),
        ]);

        return {
            categories,
            products: productsResponse.products,
        };
    },
});

function ProductsPage() {
    const router = useRouter();
    const { categories, products } = Route.useLoaderData();
    const [visibleProducts, setVisibleProducts] = useState(products);
    useEffect(() => {
        setVisibleProducts(products);
    }, [products]);
    const [searchValue, setSearchValue] = useState("");
    const [statusValue, setStatusValue] = useState<"active" | "inactive">(
        "active"
    );
    const [categoryValue, setCategoryValue] = useState<string>("all");
    const [isFiltering, setIsFiltering] = useState(false);
    const [deletingProductId, setDeletingProductId] = useState<string | null>(
        null
    );
    const categoryOptions = buildCategoryHierarchy(categories);
    const categoryNameById = new Map(
        categories.map((category) => [category.id, category.name])
    );

    const applyFilters = async () => {
        try {
            setIsFiltering(true);
            const response = await getProducts({
                data: {
                    categoryId:
                        categoryValue === "all" ? undefined : categoryValue,
                    isActive: statusValue === "active",
                    search: searchValue,
                },
            });
            setVisibleProducts(response.products);
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to fetch products.";
            toast.error(message);
        } finally {
            setIsFiltering(false);
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
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to mark product inactive.";
            toast.error(message);
        } finally {
            setDeletingProductId(null);
        }
    };

    return (
        <section className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <h1 className="font-semibold text-2xl">Products</h1>
                    <p className="text-muted-foreground text-sm">
                        Manage your catalog and inventory metadata.
                    </p>
                </div>
                <Button render={<Link to="/products/new" />}>
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
                        onValueChange={(nextValue) =>
                            setStatusValue(
                                nextValue === "inactive" ? "inactive" : "active"
                            )
                        }
                        value={statusValue}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
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
                <div className="md:col-span-4">
                    <Button disabled={isFiltering} onClick={applyFilters}>
                        {isFiltering ? "Filtering..." : "Apply Filters"}
                    </Button>
                </div>
            </div>

            <div className="overflow-hidden rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
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
                                <TableCell className="text-center" colSpan={6}>
                                    No products found.
                                </TableCell>
                            </TableRow>
                        ) : (
                            visibleProducts.map((product) => (
                                <TableRow key={product.id}>
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
