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
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Edit Category</CardTitle>
            </CardHeader>
            <CardContent>
                <CategoryForm
                    categories={categories}
                    excludeCategoryIds={[category.id]}
                    initialValues={{
                        description: category.description ?? "",
                        name: category.name,
                        parentId: category.parentId ?? "",
                    }}
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
                        } catch (error) {
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : "Failed to update category.";
                            toast.error(message);
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                    submitLabel="Save Changes"
                />
            </CardContent>
        </Card>
    );
}
