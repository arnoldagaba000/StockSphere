import { useMemo, useReducer } from "react";
import { buildCategoryHierarchy } from "@/components/features/categories/utils";
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
import { Textarea } from "@/components/ui/textarea";

const INPUT_CLASS =
    "h-10 rounded-xl border-border/70 bg-muted/35 shadow-sm transition-colors hover:bg-muted/55";
const TEXTAREA_CLASS =
    "rounded-xl border-border/70 bg-muted/35 shadow-sm transition-colors hover:bg-muted/55";
const SELECT_TRIGGER_CLASS =
    "h-10 w-full rounded-xl border-border/70 bg-muted/35 px-3 shadow-sm transition-colors hover:bg-muted/55";
const SELECT_CONTENT_CLASS =
    "rounded-xl border-border/70 bg-popover/98 shadow-xl";

interface CategoryOption {
    id: string;
    name: string;
    parentId: string | null;
}

interface CategoryFormValues {
    description: string;
    name: string;
    parentId: string;
}

export interface CategorySubmitData {
    description: string | null;
    name: string;
    parentId: string | null;
}

interface CategoryFormProps {
    categories: CategoryOption[];
    defaultValues: CategoryFormValues;
    excludeCategoryIds?: readonly string[];
    isSubmitting: boolean;
    onSubmit: (data: CategorySubmitData) => Promise<void>;
    submitLabel: string;
}

const EMPTY_EXCLUDED_CATEGORY_IDS: readonly string[] = [];

const toNullableString = (value: string): string | null => {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

const updateCategoryFormValues = (
    values: CategoryFormValues,
    patch: Partial<CategoryFormValues>
): CategoryFormValues => ({
    ...values,
    ...patch,
});

const CategoryForm = ({
    categories,
    excludeCategoryIds = EMPTY_EXCLUDED_CATEGORY_IDS,
    defaultValues,
    isSubmitting,
    onSubmit,
    submitLabel,
}: CategoryFormProps) => {
    const [values, setValues] = useReducer(
        updateCategoryFormValues,
        defaultValues
    );
    const parentCategoryOptions = useMemo(
        () => buildCategoryHierarchy(categories, excludeCategoryIds),
        [categories, excludeCategoryIds]
    );

    return (
        <form
            action={async () => {
                await onSubmit({
                    description: toNullableString(values.description),
                    name: values.name.trim(),
                    parentId: toNullableString(values.parentId),
                });
            }}
            className="space-y-4"
        >
            <div className="space-y-2">
                <Label htmlFor="category-name">Category Name</Label>
                <Input
                    className={INPUT_CLASS}
                    id="category-name"
                    onChange={(event) =>
                        setValues({
                            name: event.target.value,
                        })
                    }
                    required
                    value={values.name}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="category-parent">Parent Category</Label>
                <Select
                    onValueChange={(nextValue) =>
                        setValues({
                            parentId:
                                nextValue && nextValue !== "none"
                                    ? nextValue
                                    : "",
                        })
                    }
                    value={values.parentId || "none"}
                >
                    <SelectTrigger
                        className={SELECT_TRIGGER_CLASS}
                        id="category-parent"
                    >
                        <SelectValue placeholder="Select parent category" />
                    </SelectTrigger>
                    <SelectContent className={SELECT_CONTENT_CLASS}>
                        <SelectItem value="none">No parent</SelectItem>
                        {parentCategoryOptions.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label htmlFor="category-description">Description</Label>
                <Textarea
                    className={TEXTAREA_CLASS}
                    id="category-description"
                    onChange={(event) =>
                        setValues({
                            description: event.target.value,
                        })
                    }
                    rows={4}
                    value={values.description}
                />
            </div>

            <Button disabled={isSubmitting} type="submit">
                {isSubmitting ? "Saving..." : submitLabel}
            </Button>
        </form>
    );
};

export default CategoryForm;
