import { z } from "zod";

const toNullableTrimmedString = (value: unknown): string | null | undefined => {
    if (value === null || value === undefined) {
        return value as null | undefined;
    }

    if (typeof value !== "string") {
        return value as string;
    }

    const trimmedValue = value.trim();
    return trimmedValue.length === 0 ? null : trimmedValue;
};

export const categorySchema = z.object({
    name: z.string().trim().min(1, "Category name is required").max(100),
    description: z.preprocess(
        toNullableTrimmedString,
        z.string().max(500).nullable().optional()
    ),
    parentId: z.preprocess(
        toNullableTrimmedString,
        z.string().cuid().nullable().optional()
    ),
});

export const updateCategorySchema = categorySchema.partial().extend({
    id: z.string().cuid("Invalid category id"),
});

export type CategoryFormData = z.infer<typeof categorySchema>;
export type UpdateCategoryFormData = z.infer<typeof updateCategorySchema>;
