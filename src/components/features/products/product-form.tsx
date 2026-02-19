import { useState } from "react";
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
    maximumStock: string;
    minimumStock: string;
    name: string;
    reorderPoint: string;
    reorderQuantity: string;
    sellingPrice: string;
    status: "ACTIVE" | "ARCHIVED" | "DISCONTINUED" | "DRAFT";
    sku: string;
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
    maximumStock: number | null;
    minimumStock: number | null;
    name: string;
    reorderPoint: number | null;
    reorderQuantity: number | null;
    sellingPrice: number | null;
    status: "ACTIVE" | "ARCHIVED" | "DISCONTINUED" | "DRAFT";
    sku: string;
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
    initialValues: ProductFormValues;
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

const ProductForm = ({
    categories,
    initialValues,
    isSubmitting,
    onSubmit,
    submitLabel,
}: ProductFormProps) => {
    const [values, setValues] = useState<ProductFormValues>(initialValues);

    return (
        <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={async (event) => {
                event.preventDefault();

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
                    trackByBatch: values.trackByBatch,
                    trackByExpiry: values.trackByExpiry,
                    trackBySerialNumber: values.trackBySerialNumber,
                    unit: values.unit.trim(),
                    weight: toNullableNumber(values.weight),
                    weightUnit: toNullableString(values.weightUnit),
                });
            }}
        >
            <div className="space-y-2">
                <Label htmlFor="name">Product Name</Label>
                <Input
                    id="name"
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            name: event.target.value,
                        }))
                    }
                    required
                    value={values.name}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                    id="sku"
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            sku: event.target.value,
                        }))
                    }
                    required
                    value={values.sku}
                />
            </div>
            <div className="space-y-2 md:col-span-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                    id="description"
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            description: event.target.value,
                        }))
                    }
                    rows={3}
                    value={values.description}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="barcode">Barcode</Label>
                <Input
                    id="barcode"
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            barcode: event.target.value,
                        }))
                    }
                    value={values.barcode}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Select
                    onValueChange={(nextValue) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            categoryId:
                                nextValue && nextValue !== "none"
                                    ? nextValue
                                    : "",
                        }))
                    }
                    value={values.categoryId || "none"}
                >
                    <SelectTrigger id="category">
                        <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories.map((category) => (
                            <SelectItem key={category.id} value={category.id}>
                                {category.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="cost-price">Cost Price</Label>
                <Input
                    id="cost-price"
                    min={0}
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            costPrice: event.target.value,
                        }))
                    }
                    step={1}
                    type="number"
                    value={values.costPrice}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="selling-price">Selling Price</Label>
                <Input
                    id="selling-price"
                    min={0}
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            sellingPrice: event.target.value,
                        }))
                    }
                    step={1}
                    type="number"
                    value={values.sellingPrice}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="tax-rate">Tax Rate (%)</Label>
                <Input
                    id="tax-rate"
                    max={100}
                    min={0}
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            taxRate: event.target.value,
                        }))
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
                        setValues((currentValues) => ({
                            ...currentValues,
                            status:
                                nextValue === "DRAFT" ||
                                nextValue === "DISCONTINUED" ||
                                nextValue === "ARCHIVED"
                                    ? nextValue
                                    : "ACTIVE",
                        }))
                    }
                    value={values.status}
                >
                    <SelectTrigger id="status">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="ACTIVE">Active</SelectItem>
                        <SelectItem value="DRAFT">Draft</SelectItem>
                        <SelectItem value="DISCONTINUED">
                            Discontinued
                        </SelectItem>
                        <SelectItem value="ARCHIVED">Archived</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <div className="space-y-2">
                <Label htmlFor="unit">Unit</Label>
                <Input
                    id="unit"
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            unit: event.target.value,
                        }))
                    }
                    value={values.unit}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="weight">Weight</Label>
                <Input
                    id="weight"
                    min={0}
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            weight: event.target.value,
                        }))
                    }
                    step="0.001"
                    type="number"
                    value={values.weight}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="weight-unit">Weight Unit</Label>
                <Input
                    id="weight-unit"
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            weightUnit: event.target.value,
                        }))
                    }
                    value={values.weightUnit}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="dimensions">Dimensions</Label>
                <Input
                    id="dimensions"
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            dimensions: event.target.value,
                        }))
                    }
                    placeholder="LxWxH"
                    value={values.dimensions}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="reorder-point">Reorder Point</Label>
                <Input
                    id="reorder-point"
                    min={0}
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            reorderPoint: event.target.value,
                        }))
                    }
                    step={1}
                    type="number"
                    value={values.reorderPoint}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="reorder-quantity">Reorder Quantity</Label>
                <Input
                    id="reorder-quantity"
                    min={0}
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            reorderQuantity: event.target.value,
                        }))
                    }
                    step={1}
                    type="number"
                    value={values.reorderQuantity}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="minimum-stock">Minimum Stock</Label>
                <Input
                    id="minimum-stock"
                    min={0}
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            minimumStock: event.target.value,
                        }))
                    }
                    step={1}
                    type="number"
                    value={values.minimumStock}
                />
            </div>
            <div className="space-y-2">
                <Label htmlFor="maximum-stock">Maximum Stock</Label>
                <Input
                    id="maximum-stock"
                    min={0}
                    onChange={(event) =>
                        setValues((currentValues) => ({
                            ...currentValues,
                            maximumStock: event.target.value,
                        }))
                    }
                    step={1}
                    type="number"
                    value={values.maximumStock}
                />
            </div>
            <div className="space-y-3 rounded-lg border p-3 md:col-span-2">
                <p className="font-medium text-sm">Tracking</p>
                <div className="grid gap-3 md:grid-cols-3">
                    <Label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        Serial Number
                        <Switch
                            checked={values.trackBySerialNumber}
                            onCheckedChange={(checked) =>
                                setValues((currentValues) => ({
                                    ...currentValues,
                                    trackBySerialNumber: checked,
                                }))
                            }
                        />
                    </Label>
                    <Label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        Batch
                        <Switch
                            checked={values.trackByBatch}
                            onCheckedChange={(checked) =>
                                setValues((currentValues) => ({
                                    ...currentValues,
                                    trackByBatch: checked,
                                }))
                            }
                        />
                    </Label>
                    <Label className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        Expiry
                        <Switch
                            checked={values.trackByExpiry}
                            onCheckedChange={(checked) =>
                                setValues((currentValues) => ({
                                    ...currentValues,
                                    trackByExpiry: checked,
                                }))
                            }
                        />
                    </Label>
                </div>
            </div>
            <div className="md:col-span-2">
                <Button disabled={isSubmitting} type="submit">
                    {isSubmitting ? "Saving..." : submitLabel}
                </Button>
            </div>
        </form>
    );
};

export default ProductForm;
