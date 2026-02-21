import { useReducer } from "react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

const INPUT_CLASS =
    "h-10 rounded-xl border-border/70 bg-muted/35 shadow-sm transition-colors hover:bg-muted/55";
const SELECT_TRIGGER_CLASS =
    "h-10 w-full rounded-xl border-border/70 bg-muted/35 px-3 shadow-sm transition-colors hover:bg-muted/55";
const SELECT_CONTENT_CLASS =
    "rounded-xl border-border/70 bg-popover/98 shadow-xl";

export interface CategoryOption {
    id: string;
    label: string;
}

export interface ProductFormValues {
    barcode: string;
    categoryId: string;
    costPrice: string;
    description: string;
    dimensions: string;
    isKit: boolean;
    maximumStock: string;
    minimumStock: string;
    name: string;
    reorderPoint: string;
    reorderQuantity: string;
    sellingPrice: string;
    sku: string;
    status: "ACTIVE" | "ARCHIVED" | "DISCONTINUED" | "DRAFT";
    taxRate: string;
    trackByBatch: boolean;
    trackByExpiry: boolean;
    trackBySerialNumber: boolean;
    unit: string;
    weight: string;
    weightUnit: string;
}

export interface ProductSubmitData {
    barcode: string | null;
    categoryId: string | null;
    costPrice: number | null;
    description: string | null;
    dimensions: string | null;
    isKit: boolean;
    maximumStock: number | null;
    minimumStock: number | null;
    name: string;
    reorderPoint: number | null;
    reorderQuantity: number | null;
    sellingPrice: number | null;
    sku: string;
    status: "ACTIVE" | "ARCHIVED" | "DISCONTINUED" | "DRAFT";
    taxRate: number | null;
    trackByBatch: boolean;
    trackByExpiry: boolean;
    trackBySerialNumber: boolean;
    unit: string;
    weight: number | null;
    weightUnit: string | null;
}

interface ProductFormProps {
    categories: CategoryOption[];
    defaultValues: ProductFormValues;
    isSubmitting: boolean;
    onSubmit: (data: ProductSubmitData) => Promise<void>;
    submitLabel: string;
}

const toNullableString = (value: string): string | null => {
    const trimmedValue = value.trim();
    return trimmedValue.length > 0 ? trimmedValue : null;
};

const toNullableNumber = (value: string): number | null => {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
        return null;
    }

    const parsedValue = Number(trimmedValue);
    return Number.isFinite(parsedValue) ? parsedValue : null;
};

const updateProductFormValues = (
    values: ProductFormValues,
    patch: Partial<ProductFormValues>
): ProductFormValues => ({
    ...values,
    ...patch,
});

type SetProductFormValues = (patch: Partial<ProductFormValues>) => void;

interface ProductIdentitySectionProps {
    categories: CategoryOption[];
    setValues: SetProductFormValues;
    values: ProductFormValues;
}

const ProductIdentitySection = ({
    categories,
    setValues,
    values,
}: ProductIdentitySectionProps) => (
    <>
        <div className="space-y-2">
            <Label htmlFor="name">Product Name</Label>
            <Input
                className={INPUT_CLASS}
                id="name"
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
            <Label htmlFor="sku">SKU</Label>
            <Input
                className={INPUT_CLASS}
                id="sku"
                onChange={(event) =>
                    setValues({
                        sku: event.target.value,
                    })
                }
                required
                value={values.sku}
            />
        </div>
        <div className="space-y-2 md:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
                className="rounded-xl border-border/70 bg-muted/35 shadow-sm transition-colors hover:bg-muted/55"
                id="description"
                onChange={(event) =>
                    setValues({
                        description: event.target.value,
                    })
                }
                rows={3}
                value={values.description}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="barcode">Barcode</Label>
            <Input
                className={INPUT_CLASS}
                id="barcode"
                onChange={(event) =>
                    setValues({
                        barcode: event.target.value,
                    })
                }
                value={values.barcode}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="category">Category</Label>
            <Select
                onValueChange={(nextValue) =>
                    setValues({
                        categoryId:
                            nextValue && nextValue !== "none" ? nextValue : "",
                    })
                }
                value={values.categoryId || "none"}
            >
                <SelectTrigger className={SELECT_TRIGGER_CLASS} id="category">
                    <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT_CLASS}>
                    <SelectItem value="none">No category</SelectItem>
                    {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                            {category.label}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    </>
);

interface ProductPricingSectionProps {
    setValues: SetProductFormValues;
    values: ProductFormValues;
}

const ProductPricingSection = ({
    setValues,
    values,
}: ProductPricingSectionProps) => (
    <>
        <div className="space-y-2">
            <Label htmlFor="cost-price">Cost Price</Label>
            <Input
                className={INPUT_CLASS}
                id="cost-price"
                min={0}
                onChange={(event) =>
                    setValues({
                        costPrice: event.target.value,
                    })
                }
                step={1}
                type="number"
                value={values.costPrice}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="selling-price">Selling Price</Label>
            <Input
                className={INPUT_CLASS}
                id="selling-price"
                min={0}
                onChange={(event) =>
                    setValues({
                        sellingPrice: event.target.value,
                    })
                }
                step={1}
                type="number"
                value={values.sellingPrice}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="tax-rate">Tax Rate (%)</Label>
            <Input
                className={INPUT_CLASS}
                id="tax-rate"
                max={100}
                min={0}
                onChange={(event) =>
                    setValues({
                        taxRate: event.target.value,
                    })
                }
                step={1}
                type="number"
                value={values.taxRate}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="status">Lifecycle Status</Label>
            <Select
                onValueChange={(nextValue) =>
                    setValues({
                        status:
                            nextValue === "DRAFT" ||
                            nextValue === "DISCONTINUED" ||
                            nextValue === "ARCHIVED"
                                ? nextValue
                                : "ACTIVE",
                    })
                }
                value={values.status}
            >
                <SelectTrigger className={SELECT_TRIGGER_CLASS} id="status">
                    <SelectValue />
                </SelectTrigger>
                <SelectContent className={SELECT_CONTENT_CLASS}>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="DISCONTINUED">Discontinued</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                </SelectContent>
            </Select>
        </div>
    </>
);

interface ProductInventorySectionProps {
    setValues: SetProductFormValues;
    values: ProductFormValues;
}

const ProductInventorySection = ({
    setValues,
    values,
}: ProductInventorySectionProps) => (
    <>
        <div className="space-y-2">
            <Label htmlFor="unit">Unit</Label>
            <Input
                className={INPUT_CLASS}
                id="unit"
                onChange={(event) =>
                    setValues({
                        unit: event.target.value,
                    })
                }
                value={values.unit}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="weight">Weight</Label>
            <Input
                className={INPUT_CLASS}
                id="weight"
                min={0}
                onChange={(event) =>
                    setValues({
                        weight: event.target.value,
                    })
                }
                step="0.001"
                type="number"
                value={values.weight}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="weight-unit">Weight Unit</Label>
            <Input
                className={INPUT_CLASS}
                id="weight-unit"
                onChange={(event) =>
                    setValues({
                        weightUnit: event.target.value,
                    })
                }
                value={values.weightUnit}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="dimensions">Dimensions</Label>
            <Input
                className={INPUT_CLASS}
                id="dimensions"
                onChange={(event) =>
                    setValues({
                        dimensions: event.target.value,
                    })
                }
                placeholder="LxWxH"
                value={values.dimensions}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="reorder-point">Reorder Point</Label>
            <Input
                className={INPUT_CLASS}
                id="reorder-point"
                min={0}
                onChange={(event) =>
                    setValues({
                        reorderPoint: event.target.value,
                    })
                }
                step={1}
                type="number"
                value={values.reorderPoint}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="reorder-quantity">Reorder Quantity</Label>
            <Input
                className={INPUT_CLASS}
                id="reorder-quantity"
                min={0}
                onChange={(event) =>
                    setValues({
                        reorderQuantity: event.target.value,
                    })
                }
                step={1}
                type="number"
                value={values.reorderQuantity}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="minimum-stock">Minimum Stock</Label>
            <Input
                className={INPUT_CLASS}
                id="minimum-stock"
                min={0}
                onChange={(event) =>
                    setValues({
                        minimumStock: event.target.value,
                    })
                }
                step={1}
                type="number"
                value={values.minimumStock}
            />
        </div>
        <div className="space-y-2">
            <Label htmlFor="maximum-stock">Maximum Stock</Label>
            <Input
                className={INPUT_CLASS}
                id="maximum-stock"
                min={0}
                onChange={(event) =>
                    setValues({
                        maximumStock: event.target.value,
                    })
                }
                step={1}
                type="number"
                value={values.maximumStock}
            />
        </div>
    </>
);

interface ProductTrackingSectionProps {
    setValues: SetProductFormValues;
    values: ProductFormValues;
}

const ProductTrackingSection = ({
    setValues,
    values,
}: ProductTrackingSectionProps) => (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card/70 p-4 md:col-span-2">
        <p className="font-medium text-sm">Tracking</p>
        <div className="grid gap-3 md:grid-cols-4">
            <Label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                Is Kit
                <Switch
                    checked={values.isKit}
                    onCheckedChange={(checked) =>
                        setValues({
                            isKit: checked,
                        })
                    }
                />
            </Label>
            <Label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                Serial Number
                <Switch
                    checked={values.trackBySerialNumber}
                    onCheckedChange={(checked) =>
                        setValues({
                            trackBySerialNumber: checked,
                        })
                    }
                />
            </Label>
            <Label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                Batch
                <Switch
                    checked={values.trackByBatch}
                    onCheckedChange={(checked) =>
                        setValues({
                            trackByBatch: checked,
                        })
                    }
                />
            </Label>
            <Label className="flex items-center justify-between gap-3 rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                Expiry
                <Switch
                    checked={values.trackByExpiry}
                    onCheckedChange={(checked) =>
                        setValues({
                            trackByExpiry: checked,
                        })
                    }
                />
            </Label>
        </div>
    </div>
);

const ProductForm = ({
    categories,
    defaultValues,
    isSubmitting,
    onSubmit,
    submitLabel,
}: ProductFormProps) => {
    const [values, setValues] = useReducer(
        updateProductFormValues,
        defaultValues
    );

    return (
        <form
            action={async () => {
                await onSubmit({
                    barcode: toNullableString(values.barcode),
                    categoryId: toNullableString(values.categoryId),
                    costPrice: toNullableNumber(values.costPrice),
                    description: toNullableString(values.description),
                    dimensions: toNullableString(values.dimensions),
                    maximumStock: toNullableNumber(values.maximumStock),
                    minimumStock: toNullableNumber(values.minimumStock),
                    name: values.name.trim(),
                    reorderPoint: toNullableNumber(values.reorderPoint),
                    reorderQuantity: toNullableNumber(values.reorderQuantity),
                    sellingPrice: toNullableNumber(values.sellingPrice),
                    status: values.status,
                    sku: values.sku.trim().toUpperCase(),
                    taxRate: toNullableNumber(values.taxRate),
                    isKit: values.isKit,
                    trackByBatch: values.trackByBatch,
                    trackByExpiry: values.trackByExpiry,
                    trackBySerialNumber: values.trackBySerialNumber,
                    unit: values.unit.trim(),
                    weight: toNullableNumber(values.weight),
                    weightUnit: toNullableString(values.weightUnit),
                });
            }}
            className="grid gap-4 md:grid-cols-2"
        >
            <ProductIdentitySection
                categories={categories}
                setValues={setValues}
                values={values}
            />
            <ProductPricingSection setValues={setValues} values={values} />
            <ProductInventorySection setValues={setValues} values={values} />
            <ProductTrackingSection setValues={setValues} values={values} />
            <div className="md:col-span-2">
                <Button disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Saving..." : submitLabel}
                </Button>
            </div>
        </form>
    );
};

export default ProductForm;
