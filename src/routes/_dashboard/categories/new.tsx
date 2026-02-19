import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import CategoryForm from "@/components/features/categories/category-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createCategory } from "@/features/categories/create-category";
import { listCategories } from "@/features/categories/list-categories";

export const Route = createFileRoute("/_dashboard/categories/new")({
    component: NewCategoryPage,
    loader: () => listCategories({ data: { isActive: true } }),
});

function NewCategoryPage() {
    const navigate = useNavigate();
    const categories = Route.useLoaderData();
    const [isSubmitting, setIsSubmitting] = useState(false);

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>Create Category</CardTitle>
            </CardHeader>
            <CardContent>
                <CategoryForm
                    categories={categories}
                    initialValues={{
                        description: "",
                        name: "",
                        parentId: "",
                    }}
                    isSubmitting={isSubmitting}
                    onSubmit={async (data) => {
                        try {
                            setIsSubmitting(true);
                            await createCategory({ data });
                            toast.success("Category created.");
                            await navigate({ to: "/categories" });
                        } catch (error) {
                            const message =
                                error instanceof Error
                                    ? error.message
                                    : "Failed to create category.";
                            toast.error(message);
                        } finally {
                            setIsSubmitting(false);
                        }
                    }}
                    submitLabel="Create Category"
                />
            </CardContent>
        </Card>
    );
}
