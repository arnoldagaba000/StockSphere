import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import ProductForm, {
    type ProductFormValues,
    type ProductSubmitData,
} from "@/components/features/products/product-form";
import { buildCategoryHierarchy } from "@/components/features/products/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategories } from "@/features/categories/get-categories";
import { getProduct } from "@/features/products/get-product";
import { updateProduct } from "@/features/products/update-product";

interface ProductEditLoaderData {
    categories: Awaited<ReturnType<typeof getCategories>>;
    product: Awaited<ReturnType<typeof getProduct>>;
}

const toFormValues = (
    product: ProductEditLoaderData["product"]
): ProductFormValues => ({
    barcode: product.barcode ?? "",
    categoryId: product.categoryId ?? "",
    costPrice: product.costPrice != null ? String(product.costPrice / 100) : "",
    description: product.description ?? "",
    dimensions: product.dimensions ?? "",
    maximumStock:
        product.maximumStock != null ? String(product.maximumStock) : "",
    minimumStock:
        product.minimumStock != null ? String(product.minimumStock) : "",
    name: product.name,
    reorderPoint:
        product.reorderPoint != null ? String(product.reorderPoint) : "",
    reorderQuantity:
        product.reorderQuantity != null ? String(product.reorderQuantity) : "",
    sellingPrice:
        product.sellingPrice != null ? String(product.sellingPrice / 100) : "",
    sku: product.sku,
    taxRate: product.taxRate != null ? String(product.taxRate) : "",
    trackByBatch: product.trackByBatch,
    trackByExpiry: product.trackByExpiry,
    trackBySerialNumber: product.trackBySerialNumber,
    unit: product.unit,
    weight: product.weight ?? "",
    weightUnit: product.weightUnit ?? "",
});

export const Route = createFileRoute("/_dashboard/products/$productId")({
    component: EditProductPage,
    loader: async ({ params }): Promise<ProductEditLoaderData> => {
        const [categories, product] = await Promise.all([
            getCategories(),
            getProduct({
                data: {
                    id: params.productId,
                },
            }),
        ]);

        return {
            categories,
            product,
        };
    },
});

function EditProductPage() {
    const navigate = useNavigate();
    const { categories, product } = Route.useLoaderData();
    const categoryOptions = buildCategoryHierarchy(categories);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (formData: ProductSubmitData) => {
        try {
            setIsSubmitting(true);
            await updateProduct({
                data: {
                    ...formData,
                    id: product.id,
                },
            });
            toast.success("Product updated.");
            await navigate({ to: "/products" });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update product.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Edit Product</CardTitle>
            </CardHeader>
            <CardContent>
                <ProductForm
                    categories={categoryOptions}
                    initialValues={toFormValues(product)}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit}
                    submitLabel="Save Changes"
                />
            </CardContent>
        </Card>
    );
}
