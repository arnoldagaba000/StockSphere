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
import { createProduct } from "@/features/products/create-product";

const DEFAULT_PRODUCT_FORM_VALUES: ProductFormValues = {
    barcode: "",
    categoryId: "",
    costPrice: "",
    description: "",
    dimensions: "",
    maximumStock: "",
    minimumStock: "0",
    name: "",
    reorderPoint: "0",
    reorderQuantity: "",
    sellingPrice: "",
    status: "ACTIVE",
    sku: "",
    taxRate: "",
    trackByBatch: false,
    trackByExpiry: false,
    trackBySerialNumber: false,
    unit: "pcs",
    weight: "",
    weightUnit: "",
};

export const Route = createFileRoute("/_dashboard/products/new")({
    component: NewProductPage,
    loader: () => getCategories(),
});

function NewProductPage() {
    const navigate = useNavigate();
    const categories = Route.useLoaderData();
    const categoryOptions = buildCategoryHierarchy(categories);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (formData: ProductSubmitData) => {
        try {
            setIsSubmitting(true);
            await createProduct({
                data: formData,
            });
            toast.success("Product created.");
            await navigate({ to: "/products" });
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create product.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Create Product</CardTitle>
            </CardHeader>
            <CardContent>
                <ProductForm
                    categories={categoryOptions}
                    initialValues={DEFAULT_PRODUCT_FORM_VALUES}
                    isSubmitting={isSubmitting}
                    onSubmit={handleSubmit}
                    submitLabel="Create Product"
                />
            </CardContent>
        </Card>
    );
}
