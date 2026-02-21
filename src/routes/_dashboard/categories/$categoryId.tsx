import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import CategoryForm from "@/components/features/categories/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCategory } from "@/features/categories/get-category";
import { listCategories } from "@/features/categories/list-categories";
import { updateCategory } from "@/features/categories/update-category";

interface CategoryEditLoaderData {
    categories: Awaited<ReturnType<typeof listCategories>>;
    category: Awaited<ReturnType<typeof getCategory>>;
}

export const Route = createFileRoute("/_dashboard/categories/$categoryId")({
    component: EditCategoryPage,
    loader: async ({ params }): Promise<CategoryEditLoaderData> => {
        const [categories, category] = await Promise.all([
            listCategories({ data: { isActive: true } }),
            getCategory({
                data: {
                    id: params.categoryId,
                },
            }),
        ]);

        return {
            categories,
            category,
        };
    },
});

function EditCategoryPage() {
    const navigate = useNavigate();
    const { categories, category } = Route.useLoaderData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <div className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Edit Category</h1>
                <p className="text-muted-foreground text-sm">
                    Update hierarchy and metadata without breaking linked
                    products.
                </p>
            </div>
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
                        onSubmit={async (data) => {
                            try {
                                setIsSubmitting(true);
                                await updateCategory({
                                    data: {
                                        ...data,
                                        id: category.id,
                                    },
                                });
                                toast.success("Category updated.");
                                await navigate({ to: "/categories" });
                                setIsSubmitting(false);
                            } catch (error) {
                                setIsSubmitting(false);
                                const message =
                                    error instanceof Error
                                        ? error.message
                                        : "Failed to update category.";
                                toast.error(message);
                            }
                        }}
                        submitLabel="Save Changes"
                    />
                </CardContent>
            </Card>
        </div>
    );
}
