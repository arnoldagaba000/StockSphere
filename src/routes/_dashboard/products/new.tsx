import {
    createFileRoute,
    useNavigate,
    useRouter,
} from "@tanstack/react-router";
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
    isKit: false,
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
    const router = useRouter();
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
            await router.invalidate();
            await navigate({ to: "/products" });
            setIsSubmitting(false);
        } catch (error) {
            setIsSubmitting(false);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to create product.";
            toast.error(message);
        }
    };

    return (
        <div className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Create Product</h1>
                <p className="text-muted-foreground text-sm">
                    Add a product with pricing, inventory controls, and tracking
                    configuration.
                </p>
            </div>
            <Card className="w-full rounded-xl border-border/70 shadow-sm">
                <CardHeader className="space-y-1">
                    <CardTitle>Create Product</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProductForm
                        categories={categoryOptions}
                        defaultValues={DEFAULT_PRODUCT_FORM_VALUES}
                        isSubmitting={isSubmitting}
                        onSubmit={handleSubmit}
                        submitLabel="Create Product"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
