import {
    createFileRoute,
    useNavigate,
    useRouter,
} from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import ProductForm, {
    type ProductFormValues,
    type ProductSubmitData,
} from "@/components/features/products/product-form";
import {
    buildCategoryHierarchy,
    formatCurrencyFromMinorUnits,
} from "@/components/features/products/utils";
import {
    RouteErrorFallback,
    RoutePendingFallback,
} from "@/components/layout/route-feedback";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getCategories } from "@/features/categories/get-categories";
import { getProduct } from "@/features/products/get-product";
import { getProductPriceHistory } from "@/features/products/get-product-price-history";
import {
    addProductMedia,
    deleteProductMedia,
    listProductMedia,
    setPrimaryProductMedia,
} from "@/features/products/manage-product-media";
import {
    applyDueProductPriceSchedules,
    approveProductChangeRequest,
    cancelProductPriceSchedule,
    createProductPriceSchedule,
    listProductChangeRequests,
    listProductPriceSchedules,
    rejectProductChangeRequest,
} from "@/features/products/manage-product-pricing";
import {
    linkSupplierToProduct,
    listProductSuppliers,
    unlinkSupplierFromProduct,
} from "@/features/products/manage-product-suppliers";
import {
    deleteProductVariant,
    listProductVariants,
    upsertProductVariant,
} from "@/features/products/manage-product-variants";
import { updateProduct } from "@/features/products/update-product";
import { getFinancialSettings } from "@/features/settings/get-financial-settings";
import { listSuppliers } from "@/features/suppliers/list-suppliers";

const CARD_SHELL_CLASS = "rounded-xl border border-border/70 bg-card shadow-sm";
const SELECT_TRIGGER_CLASS =
    "h-10 w-full rounded-xl border-border/70 bg-muted/35 px-3 shadow-sm transition-colors hover:bg-muted/55";
const SELECT_CONTENT_CLASS =
    "rounded-xl border-border/70 bg-popover/98 shadow-xl";
const SECTION_INPUT_CLASS =
    "h-10 rounded-xl border-border/70 bg-muted/35 shadow-sm transition-colors hover:bg-muted/55";

interface ProductEditLoaderData {
    categories: Awaited<ReturnType<typeof getCategories>>;
    changeRequests: Awaited<ReturnType<typeof listProductChangeRequests>>;
    financialSettings: Awaited<ReturnType<typeof getFinancialSettings>>;
    priceHistory: Awaited<ReturnType<typeof getProductPriceHistory>>;
    priceSchedules: Awaited<ReturnType<typeof listProductPriceSchedules>>;
    product: Awaited<ReturnType<typeof getProduct>>;
    productMedia: Awaited<ReturnType<typeof listProductMedia>>;
    productSuppliers: Awaited<ReturnType<typeof listProductSuppliers>>;
    suppliers: Awaited<ReturnType<typeof listSuppliers>>;
    variants: Awaited<ReturnType<typeof listProductVariants>>;
}

interface EditProductPageState {
    isSubmitting: boolean;
    mediaAltText: string;
    mediaUrl: string;
    quickVariantAttributeName: string;
    quickVariantNamePrefix: string;
    quickVariantSkuPrefix: string;
    quickVariantValues: string;
    scheduleCostPrice: string;
    scheduleEffectiveAt: string;
    scheduleReason: string;
    scheduleSellingPrice: string;
    supplierId: string;
    supplierSku: string;
    variantAttributes: string;
    variantName: string;
    variantSku: string;
}

type EditProductPageAction =
    | Partial<EditProductPageState>
    | ((state: EditProductPageState) => Partial<EditProductPageState>);

const editProductPageReducer = (
    state: EditProductPageState,
    action: EditProductPageAction
): EditProductPageState => {
    const patch = typeof action === "function" ? action(state) : action;
    return {
        ...state,
        ...patch,
    };
};

const hasPendingApprovalResponse = (response: unknown): boolean => {
    if (typeof response !== "object" || response === null) {
        return false;
    }

    if (!("pendingApproval" in response)) {
        return false;
    }

    return Boolean(response.pendingApproval);
};

const parseVariantAttributes = (
    value: string
): Record<string, string> | null => {
    const trimmedValue = value.trim();
    if (trimmedValue.length === 0) {
        return {};
    }

    try {
        if (trimmedValue.startsWith("{")) {
            return JSON.parse(trimmedValue) as Record<string, string>;
        }

        const pairs = trimmedValue
            .split(",")
            .map((part) => part.trim())
            .filter(Boolean);
        const attributes: Record<string, string> = {};

        for (const pair of pairs) {
            const delimiterIndex = pair.includes("=")
                ? pair.indexOf("=")
                : pair.indexOf(":");
            if (delimiterIndex <= 0) {
                return null;
            }

            const key = pair.slice(0, delimiterIndex).trim();
            const rawValue = pair.slice(delimiterIndex + 1).trim();
            if (!(key && rawValue)) {
                return null;
            }
            attributes[key] = rawValue;
        }

        return attributes;
    } catch {
        return null;
    }
};

const formatUtcDateTime = (value: Date | string): string => {
    const date = value instanceof Date ? value : new Date(value);
    return `${date.toISOString().slice(0, 16).replace("T", " ")} UTC`;
};

const toFormValues = (
    product: ProductEditLoaderData["product"]
): ProductFormValues => ({
    barcode: product.barcode ?? "",
    categoryId: product.categoryId ?? "",
    costPrice: product.costPrice != null ? String(product.costPrice) : "",
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
        product.sellingPrice != null ? String(product.sellingPrice) : "",
    sku: product.sku,
    status: product.status,
    taxRate: product.taxRate != null ? String(product.taxRate) : "",
    isKit: product.isKit,
    trackByBatch: product.trackByBatch,
    trackByExpiry: product.trackByExpiry,
    trackBySerialNumber: product.trackBySerialNumber,
    unit: product.unit,
    weight: product.weight ?? "",
    weightUnit: product.weightUnit ?? "",
});

interface SupplierLinksSectionProps {
    onRefresh: () => Promise<void>;
    onStatePatch: (patch: Partial<EditProductPageState>) => void;
    product: ProductEditLoaderData["product"];
    productSuppliers: ProductEditLoaderData["productSuppliers"];
    supplierId: string;
    supplierSku: string;
    suppliers: ProductEditLoaderData["suppliers"];
}

const SupplierLinksSection = ({
    onRefresh,
    onStatePatch,
    product,
    productSuppliers,
    supplierId,
    supplierSku,
    suppliers,
}: SupplierLinksSectionProps) => {
    return (
        <Card className={CARD_SHELL_CLASS}>
            <CardHeader>
                <CardTitle>Supplier Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                    <Select
                        onValueChange={(value) =>
                            onStatePatch({ supplierId: value ?? "none" })
                        }
                        value={supplierId}
                    >
                        <SelectTrigger className={SELECT_TRIGGER_CLASS}>
                            <SelectValue placeholder="Supplier" />
                        </SelectTrigger>
                        <SelectContent className={SELECT_CONTENT_CLASS}>
                            <SelectItem value="none">
                                Select supplier
                            </SelectItem>
                            {suppliers.map((supplier) => (
                                <SelectItem
                                    key={supplier.id}
                                    value={supplier.id}
                                >
                                    {supplier.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Input
                        className={SECTION_INPUT_CLASS}
                        onChange={(event) =>
                            onStatePatch({
                                supplierSku: event.target.value,
                            })
                        }
                        placeholder="Supplier SKU"
                        value={supplierSku}
                    />
                    <Button
                        onClick={async () => {
                            if (supplierId === "none") {
                                toast.error("Select supplier.");
                                return;
                            }
                            await linkSupplierToProduct({
                                data: {
                                    costPrice: null,
                                    leadTimeDays: null,
                                    minimumOrderQty: null,
                                    productId: product.id,
                                    supplierId,
                                    supplierSku:
                                        supplierSku.trim().length > 0
                                            ? supplierSku
                                            : null,
                                },
                            });
                            toast.success("Supplier linked.");
                            onStatePatch({
                                supplierId: "none",
                                supplierSku: "",
                            });
                            await onRefresh();
                        }}
                    >
                        Link Supplier
                    </Button>
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Supplier SKU</TableHead>
                                <TableHead className="text-right">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productSuppliers.map((supplierLink) => (
                                <TableRow key={supplierLink.id}>
                                    <TableCell>
                                        {supplierLink.supplier.name}
                                    </TableCell>
                                    <TableCell>
                                        {supplierLink.supplierSku ?? "—"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            onClick={async () => {
                                                await unlinkSupplierFromProduct(
                                                    {
                                                        data: {
                                                            productId:
                                                                product.id,
                                                            supplierId:
                                                                supplierLink.supplierId,
                                                        },
                                                    }
                                                );
                                                toast.success(
                                                    "Supplier unlinked."
                                                );
                                                await onRefresh();
                                            }}
                                            size="sm"
                                            variant="outline"
                                        >
                                            Remove
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

interface VariantsSectionProps {
    onRefresh: () => Promise<void>;
    onStatePatch: (patch: Partial<EditProductPageState>) => void;
    product: ProductEditLoaderData["product"];
    quickVariantAttributeName: string;
    quickVariantNamePrefix: string;
    quickVariantSkuPrefix: string;
    quickVariantValues: string;
    variantAttributes: string;
    variantName: string;
    variantSku: string;
    variants: ProductEditLoaderData["variants"];
}

const VariantsSection = (props: VariantsSectionProps) =>
    renderVariantsSection(props);

const renderVariantsSection = ({
    onRefresh,
    onStatePatch,
    product,
    quickVariantAttributeName,
    quickVariantNamePrefix,
    quickVariantSkuPrefix,
    quickVariantValues,
    variantAttributes,
    variantName,
    variantSku,
    variants,
}: VariantsSectionProps) => {
    const attributeKeyPreview = quickVariantAttributeName.trim().toLowerCase();
    const quickValues = Array.from(
        new Set(
            quickVariantValues
                .split(",")
                .map((value) => value.trim())
                .filter(Boolean)
        )
    );
    const namePrefixPreview = quickVariantNamePrefix.trim() || product.name;
    const skuPrefixPreview = (
        quickVariantSkuPrefix.trim() || product.sku
    ).toUpperCase();

    return (
        <Card className={CARD_SHELL_CLASS}>
            <CardHeader className="space-y-1">
                <CardTitle>Variants</CardTitle>
                <p className="text-muted-foreground text-sm">
                    Create variants in bulk or add a single custom variant.
                </p>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-3 rounded-xl border border-border/70 bg-muted/25 p-3">
                    <div className="space-y-1">
                        <p className="font-medium text-sm">
                            Quick Variant Builder
                        </p>
                        <p className="text-muted-foreground text-xs">
                            Example: attribute `size` + values `S, M, L` creates
                            three variants immediately.
                        </p>
                    </div>
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="quick-variant-attribute">
                                Attribute
                            </Label>
                            <Input
                                className={SECTION_INPUT_CLASS}
                                id="quick-variant-attribute"
                                onChange={(event) =>
                                    onStatePatch({
                                        quickVariantAttributeName:
                                            event.target.value,
                                    })
                                }
                                placeholder="size, color, material..."
                                value={quickVariantAttributeName}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick-variant-values">Values</Label>
                            <Input
                                className={SECTION_INPUT_CLASS}
                                id="quick-variant-values"
                                onChange={(event) =>
                                    onStatePatch({
                                        quickVariantValues: event.target.value,
                                    })
                                }
                                placeholder="S, M, L"
                                value={quickVariantValues}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick-variant-name-prefix">
                                Name Prefix
                            </Label>
                            <Input
                                className={SECTION_INPUT_CLASS}
                                id="quick-variant-name-prefix"
                                onChange={(event) =>
                                    onStatePatch({
                                        quickVariantNamePrefix:
                                            event.target.value,
                                    })
                                }
                                placeholder={`Default: ${product.name}`}
                                value={quickVariantNamePrefix}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="quick-variant-sku-prefix">
                                SKU Prefix
                            </Label>
                            <Input
                                className={SECTION_INPUT_CLASS}
                                id="quick-variant-sku-prefix"
                                onChange={(event) =>
                                    onStatePatch({
                                        quickVariantSkuPrefix:
                                            event.target.value.toUpperCase(),
                                    })
                                }
                                placeholder={`Default: ${product.sku}`}
                                value={quickVariantSkuPrefix}
                            />
                        </div>
                    </div>

                    {quickValues.length > 0 ? (
                        <div className="rounded-lg border border-border/70 bg-background/70 p-3">
                            <p className="mb-2 text-muted-foreground text-xs">
                                Preview ({quickValues.length})
                            </p>
                            <div className="flex flex-wrap gap-2">
                                {quickValues.map((value) => {
                                    const skuSuffix = value
                                        .toUpperCase()
                                        .replace(/[^A-Z0-9]+/g, "-")
                                        .replace(/^-+|-+$/g, "");
                                    return (
                                        <span
                                            className="rounded-md border border-border/70 bg-muted/35 px-2 py-1 text-xs"
                                            key={value}
                                        >
                                            {namePrefixPreview} {value} ·{" "}
                                            {skuPrefixPreview}-{skuSuffix}
                                        </span>
                                    );
                                })}
                            </div>
                        </div>
                    ) : null}

                    <Button
                        disabled={
                            !attributeKeyPreview || quickValues.length === 0
                        }
                        onClick={async () => {
                            const attributeKey = attributeKeyPreview;
                            if (!attributeKey) {
                                toast.error("Enter an attribute name.");
                                return;
                            }

                            const values = quickValues;
                            if (values.length === 0) {
                                toast.error(
                                    "Enter at least one variant value."
                                );
                                return;
                            }

                            const namePrefix = namePrefixPreview;
                            const skuPrefix = skuPrefixPreview;

                            let createdCount = 0;
                            const failedValues: string[] = [];
                            for (const value of values) {
                                const skuSuffix = value
                                    .toUpperCase()
                                    .replace(/[^A-Z0-9]+/g, "-")
                                    .replace(/^-+|-+$/g, "");
                                const nextSku = `${skuPrefix}-${skuSuffix}`;
                                const nextName = `${namePrefix} ${value}`;

                                try {
                                    await upsertProductVariant({
                                        data: {
                                            attributes: {
                                                [attributeKey]: value,
                                            },
                                            barcode: null,
                                            costPrice: null,
                                            isActive: true,
                                            name: nextName,
                                            productId: product.id,
                                            sellingPrice: null,
                                            sku: nextSku,
                                        },
                                    });
                                    createdCount += 1;
                                } catch {
                                    failedValues.push(value);
                                }
                            }

                            if (createdCount > 0) {
                                toast.success(
                                    `Created ${createdCount} variants.`
                                );
                            }
                            if (failedValues.length > 0) {
                                toast.error(
                                    `Failed: ${failedValues.join(", ")}`
                                );
                            }

                            onStatePatch({
                                quickVariantAttributeName: "",
                                quickVariantNamePrefix: "",
                                quickVariantSkuPrefix: "",
                                quickVariantValues: "",
                            });
                            await onRefresh();
                        }}
                        variant="outline"
                    >
                        Create Variants From List
                    </Button>
                </div>
                <div className="space-y-3 rounded-xl border border-border/70 p-3">
                    <p className="font-medium text-sm">Manual Variant</p>
                    <div className="grid gap-3 md:grid-cols-4">
                        <div className="space-y-2">
                            <Label htmlFor="manual-variant-name">Name</Label>
                            <Input
                                className={SECTION_INPUT_CLASS}
                                id="manual-variant-name"
                                onChange={(event) =>
                                    onStatePatch({
                                        variantName: event.target.value,
                                    })
                                }
                                placeholder="Variant name"
                                value={variantName}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="manual-variant-sku">SKU</Label>
                            <Input
                                className={SECTION_INPUT_CLASS}
                                id="manual-variant-sku"
                                onChange={(event) =>
                                    onStatePatch({
                                        variantSku: event.target.value,
                                    })
                                }
                                placeholder="Variant SKU"
                                value={variantSku}
                            />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="manual-variant-attributes">
                                Attributes
                            </Label>
                            <Input
                                className={SECTION_INPUT_CLASS}
                                id="manual-variant-attributes"
                                onChange={(event) =>
                                    onStatePatch({
                                        variantAttributes: event.target.value,
                                    })
                                }
                                placeholder="size=M, color=Red (or JSON)"
                                value={variantAttributes}
                            />
                        </div>
                    </div>
                    <Button
                        disabled={!(variantName.trim() && variantSku.trim())}
                        onClick={async () => {
                            const attributes =
                                parseVariantAttributes(variantAttributes);
                            if (!attributes) {
                                toast.error("Invalid attributes format.");
                                return;
                            }
                            await upsertProductVariant({
                                data: {
                                    attributes,
                                    barcode: null,
                                    costPrice: null,
                                    isActive: true,
                                    name: variantName,
                                    productId: product.id,
                                    sellingPrice: null,
                                    sku: variantSku,
                                },
                            });
                            toast.success("Variant saved.");
                            onStatePatch({
                                variantAttributes: "",
                                variantName: "",
                                variantSku: "",
                            });
                            await onRefresh();
                        }}
                    >
                        Add Variant
                    </Button>
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>SKU</TableHead>
                                <TableHead>Attributes</TableHead>
                                <TableHead className="text-right">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {variants.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={4}
                                    >
                                        No variants yet. Use Quick Variant
                                        Builder above.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                variants.map((variant) => (
                                    <TableRow key={variant.id}>
                                        <TableCell>{variant.name}</TableCell>
                                        <TableCell>{variant.sku}</TableCell>
                                        <TableCell className="text-muted-foreground text-xs">
                                            {Object.entries(
                                                (variant.attributes as Record<
                                                    string,
                                                    string
                                                >) ?? {}
                                            )
                                                .map(
                                                    ([key, value]) =>
                                                        `${key}: ${value}`
                                                )
                                                .join(" • ") || "—"}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button
                                                onClick={async () => {
                                                    await deleteProductVariant({
                                                        data: {
                                                            id: variant.id,
                                                            productId:
                                                                product.id,
                                                        },
                                                    });
                                                    toast.success(
                                                        "Variant removed."
                                                    );
                                                    await onRefresh();
                                                }}
                                                size="sm"
                                                variant="outline"
                                            >
                                                Remove
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

interface MediaSectionProps {
    mediaAltText: string;
    mediaUrl: string;
    onRefresh: () => Promise<void>;
    onStatePatch: (patch: Partial<EditProductPageState>) => void;
    product: ProductEditLoaderData["product"];
    productMedia: ProductEditLoaderData["productMedia"];
}

const MediaSection = ({
    mediaAltText,
    mediaUrl,
    onRefresh,
    onStatePatch,
    product,
    productMedia,
}: MediaSectionProps) => {
    return (
        <Card className={CARD_SHELL_CLASS}>
            <CardHeader>
                <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                    <Input
                        className={SECTION_INPUT_CLASS}
                        onChange={(event) =>
                            onStatePatch({ mediaUrl: event.target.value })
                        }
                        placeholder="https://image-url"
                        value={mediaUrl}
                    />
                    <Input
                        className={SECTION_INPUT_CLASS}
                        onChange={(event) =>
                            onStatePatch({ mediaAltText: event.target.value })
                        }
                        placeholder="Alt text"
                        value={mediaAltText}
                    />
                    <Button
                        onClick={async () => {
                            await addProductMedia({
                                data: {
                                    altText:
                                        mediaAltText.trim().length > 0
                                            ? mediaAltText
                                            : null,
                                    isPrimary: productMedia.length === 0,
                                    productId: product.id,
                                    sortOrder: productMedia.length,
                                    url: mediaUrl,
                                },
                            });
                            toast.success("Media added.");
                            onStatePatch({ mediaAltText: "", mediaUrl: "" });
                            await onRefresh();
                        }}
                    >
                        Add Media
                    </Button>
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>URL</TableHead>
                                <TableHead>Primary</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {productMedia.map((media) => (
                                <TableRow key={media.id}>
                                    <TableCell className="max-w-[320px] truncate">
                                        {media.url}
                                    </TableCell>
                                    <TableCell>
                                        {media.isPrimary ? "Yes" : "No"}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                onClick={async () => {
                                                    await setPrimaryProductMedia(
                                                        {
                                                            data: {
                                                                mediaId:
                                                                    media.id,
                                                                productId:
                                                                    product.id,
                                                            },
                                                        }
                                                    );
                                                    await onRefresh();
                                                }}
                                                size="sm"
                                                variant="outline"
                                            >
                                                Set Primary
                                            </Button>
                                            <Button
                                                onClick={async () => {
                                                    await deleteProductMedia({
                                                        data: {
                                                            mediaId: media.id,
                                                            productId:
                                                                product.id,
                                                        },
                                                    });
                                                    await onRefresh();
                                                }}
                                                size="sm"
                                                variant="outline"
                                            >
                                                Delete
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

interface PriceSchedulingSectionProps {
    currencyCode: string;
    onRefresh: () => Promise<void>;
    onStatePatch: (patch: Partial<EditProductPageState>) => void;
    priceSchedules: ProductEditLoaderData["priceSchedules"];
    product: ProductEditLoaderData["product"];
    scheduleCostPrice: string;
    scheduleEffectiveAt: string;
    scheduleReason: string;
    scheduleSellingPrice: string;
}

const PriceSchedulingSection = ({
    currencyCode,
    onRefresh,
    onStatePatch,
    priceSchedules,
    product,
    scheduleCostPrice,
    scheduleEffectiveAt,
    scheduleReason,
    scheduleSellingPrice,
}: PriceSchedulingSectionProps) => {
    return (
        <Card className={CARD_SHELL_CLASS}>
            <CardHeader>
                <CardTitle>Price Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                    <Input
                        className={SECTION_INPUT_CLASS}
                        onChange={(event) =>
                            onStatePatch({
                                scheduleCostPrice: event.target.value,
                            })
                        }
                        placeholder={`Cost price (${currencyCode})`}
                        step={1}
                        type="number"
                        value={scheduleCostPrice}
                    />
                    <Input
                        className={SECTION_INPUT_CLASS}
                        onChange={(event) =>
                            onStatePatch({
                                scheduleSellingPrice: event.target.value,
                            })
                        }
                        placeholder={`Selling price (${currencyCode})`}
                        step={1}
                        type="number"
                        value={scheduleSellingPrice}
                    />
                    <Input
                        className={SECTION_INPUT_CLASS}
                        onChange={(event) =>
                            onStatePatch({
                                scheduleEffectiveAt: event.target.value,
                            })
                        }
                        type="datetime-local"
                        value={scheduleEffectiveAt}
                    />
                    <Input
                        className={SECTION_INPUT_CLASS}
                        onChange={(event) =>
                            onStatePatch({
                                scheduleReason: event.target.value,
                            })
                        }
                        placeholder="Reason"
                        value={scheduleReason}
                    />
                </div>
                <div className="flex gap-2">
                    <Button
                        onClick={async () => {
                            await createProductPriceSchedule({
                                data: {
                                    costPrice:
                                        scheduleCostPrice.trim().length > 0
                                            ? Number(scheduleCostPrice)
                                            : null,
                                    effectiveAt: new Date(scheduleEffectiveAt),
                                    productId: product.id,
                                    reason:
                                        scheduleReason.trim().length > 0
                                            ? scheduleReason
                                            : null,
                                    sellingPrice:
                                        scheduleSellingPrice.trim().length > 0
                                            ? Number(scheduleSellingPrice)
                                            : null,
                                },
                            });
                            toast.success("Price schedule created.");
                            onStatePatch({
                                scheduleCostPrice: "",
                                scheduleEffectiveAt: "",
                                scheduleReason: "",
                                scheduleSellingPrice: "",
                            });
                            await onRefresh();
                        }}
                    >
                        Create Schedule
                    </Button>
                    <Button
                        onClick={async () => {
                            const result =
                                await applyDueProductPriceSchedules();
                            toast.success(
                                `Applied ${result.appliedCount} schedule(s).`
                            );
                            await onRefresh();
                        }}
                        variant="outline"
                    >
                        Apply Due Schedules
                    </Button>
                </div>
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Effective At</TableHead>
                                <TableHead>Selling Price</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Action
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {priceSchedules.map((schedule) => (
                                <TableRow key={schedule.id}>
                                    <TableCell>
                                        {formatUtcDateTime(
                                            schedule.effectiveAt
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            schedule.sellingPrice,
                                            currencyCode
                                        )}
                                    </TableCell>
                                    <TableCell>{schedule.status}</TableCell>
                                    <TableCell className="text-right">
                                        <Button
                                            disabled={
                                                schedule.status !== "PENDING"
                                            }
                                            onClick={async () => {
                                                await cancelProductPriceSchedule(
                                                    {
                                                        data: {
                                                            scheduleId:
                                                                schedule.id,
                                                        },
                                                    }
                                                );
                                                await onRefresh();
                                            }}
                                            size="sm"
                                            variant="outline"
                                        >
                                            Cancel
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

interface ChangeRequestsSectionProps {
    changeRequests: ProductEditLoaderData["changeRequests"];
    onRefresh: () => Promise<void>;
}

const ChangeRequestsSection = ({
    changeRequests,
    onRefresh,
}: ChangeRequestsSectionProps) => {
    return (
        <Card className={CARD_SHELL_CLASS}>
            <CardHeader>
                <CardTitle>Pending Change Requests</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Type</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Created</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {changeRequests.map((request) => (
                                <TableRow key={request.id}>
                                    <TableCell>{request.changeType}</TableCell>
                                    <TableCell>{request.status}</TableCell>
                                    <TableCell>
                                        {formatUtcDateTime(request.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            <Button
                                                disabled={
                                                    request.status !== "PENDING"
                                                }
                                                onClick={async () => {
                                                    await approveProductChangeRequest(
                                                        {
                                                            data: {
                                                                requestId:
                                                                    request.id,
                                                            },
                                                        }
                                                    );
                                                    await onRefresh();
                                                }}
                                                size="sm"
                                                variant="outline"
                                            >
                                                Approve
                                            </Button>
                                            <Button
                                                disabled={
                                                    request.status !== "PENDING"
                                                }
                                                onClick={async () => {
                                                    await rejectProductChangeRequest(
                                                        {
                                                            data: {
                                                                requestId:
                                                                    request.id,
                                                            },
                                                        }
                                                    );
                                                    await onRefresh();
                                                }}
                                                size="sm"
                                                variant="outline"
                                            >
                                                Reject
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

interface PriceHistorySectionProps {
    currencyCode: string;
    priceHistory: ProductEditLoaderData["priceHistory"];
}

const PriceHistorySection = ({
    currencyCode,
    priceHistory,
}: PriceHistorySectionProps) => {
    return (
        <Card className={CARD_SHELL_CLASS}>
            <CardHeader>
                <CardTitle>Price History</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto rounded-md border">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Effective At</TableHead>
                                <TableHead>Cost Price</TableHead>
                                <TableHead>Selling Price</TableHead>
                                <TableHead>Reason</TableHead>
                                <TableHead>By</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {priceHistory.map((entry) => (
                                <TableRow key={entry.createdAt.toISOString()}>
                                    <TableCell>
                                        {formatUtcDateTime(entry.effectiveAt)}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            entry.costPrice,
                                            currencyCode
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            entry.sellingPrice,
                                            currencyCode
                                        )}
                                    </TableCell>
                                    <TableCell>{entry.reason ?? "—"}</TableCell>
                                    <TableCell>{entry.actorName}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
};

export const Route = createFileRoute("/_dashboard/products/$productId")({
    component: EditProductPage,
    errorComponent: EditProductRouteError,
    loader: async ({ params }): Promise<ProductEditLoaderData> => {
        const [
            categories,
            product,
            suppliers,
            productSuppliers,
            priceHistory,
            variants,
            productMedia,
            priceSchedules,
            changeRequests,
            financialSettings,
        ] = await Promise.all([
            getCategories(),
            getProduct({ data: { id: params.productId } }),
            listSuppliers(),
            listProductSuppliers({ data: { productId: params.productId } }),
            getProductPriceHistory({ data: { productId: params.productId } }),
            listProductVariants({ data: { productId: params.productId } }),
            listProductMedia({ data: { productId: params.productId } }),
            listProductPriceSchedules({
                data: { productId: params.productId },
            }),
            listProductChangeRequests({
                data: { productId: params.productId },
            }),
            getFinancialSettings(),
        ]);

        return {
            categories,
            changeRequests,
            financialSettings,
            priceHistory,
            priceSchedules,
            product,
            productMedia,
            productSuppliers,
            suppliers,
            variants,
        };
    },
    pendingComponent: EditProductRoutePending,
});

function EditProductRoutePending() {
    return (
        <RoutePendingFallback
            subtitle="Loading product details, pricing history, variants, media, and supplier links."
            title="Loading Product Detail"
        />
    );
}

function EditProductRouteError({
    error,
    reset,
}: {
    error: unknown;
    reset: () => void;
}) {
    return (
        <RouteErrorFallback
            error={error}
            reset={reset}
            title="Product detail failed to load"
            to="/products"
        />
    );
}

function EditProductPage() {
    const navigate = useNavigate();
    const router = useRouter();
    const {
        categories,
        changeRequests,
        financialSettings,
        priceHistory,
        priceSchedules,
        product,
        productMedia,
        productSuppliers,
        suppliers,
        variants,
    } = Route.useLoaderData();
    const { currencyCode } = financialSettings;
    const categoryOptions = buildCategoryHierarchy(categories);
    const [state, setState] = useReducer(editProductPageReducer, {
        isSubmitting: false,
        mediaAltText: "",
        mediaUrl: "",
        quickVariantAttributeName: "",
        quickVariantNamePrefix: "",
        quickVariantSkuPrefix: "",
        quickVariantValues: "",
        scheduleCostPrice: "",
        scheduleEffectiveAt: "",
        scheduleReason: "",
        scheduleSellingPrice: "",
        supplierId: "none",
        supplierSku: "",
        variantAttributes: "",
        variantName: "",
        variantSku: "",
    });
    const {
        isSubmitting,
        mediaAltText,
        mediaUrl,
        quickVariantAttributeName,
        quickVariantNamePrefix,
        quickVariantSkuPrefix,
        quickVariantValues,
        scheduleCostPrice,
        scheduleEffectiveAt,
        scheduleReason,
        scheduleSellingPrice,
        supplierId,
        supplierSku,
        variantAttributes,
        variantName,
        variantSku,
    } = state;

    const handleSubmit = async (formData: ProductSubmitData) => {
        try {
            setState({ isSubmitting: true });
            const response = await updateProduct({
                data: {
                    ...formData,
                    id: product.id,
                },
            });
            const hasPendingApproval = hasPendingApprovalResponse(response);

            if (hasPendingApproval) {
                toast.success("Critical change submitted for approval.");
                await router.invalidate();
                setState({ isSubmitting: false });
                return;
            }

            toast.success("Product updated.");
            await navigate({ to: "/products" });
            setState({ isSubmitting: false });
        } catch (error) {
            setState({ isSubmitting: false });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update product."
            );
        }
    };

    return (
        <div className="w-full space-y-5">
            <div>
                <h1 className="font-semibold text-2xl">Edit Product</h1>
                <p className="text-muted-foreground text-sm">
                    Manage product master data, suppliers, variants, media, and
                    controlled pricing changes.
                </p>
            </div>
            <Card className={CARD_SHELL_CLASS}>
                <CardHeader className="space-y-1">
                    <CardTitle>Edit Product</CardTitle>
                </CardHeader>
                <CardContent>
                    <ProductForm
                        categories={categoryOptions}
                        defaultValues={toFormValues(product)}
                        isSubmitting={isSubmitting}
                        onSubmit={handleSubmit}
                        submitLabel="Save Changes"
                    />
                </CardContent>
            </Card>

            <SupplierLinksSection
                onRefresh={() => router.invalidate()}
                onStatePatch={setState}
                product={product}
                productSuppliers={productSuppliers}
                supplierId={supplierId}
                supplierSku={supplierSku}
                suppliers={suppliers}
            />
            <VariantsSection
                onRefresh={() => router.invalidate()}
                onStatePatch={setState}
                product={product}
                quickVariantAttributeName={quickVariantAttributeName}
                quickVariantNamePrefix={quickVariantNamePrefix}
                quickVariantSkuPrefix={quickVariantSkuPrefix}
                quickVariantValues={quickVariantValues}
                variantAttributes={variantAttributes}
                variantName={variantName}
                variantSku={variantSku}
                variants={variants}
            />
            <MediaSection
                mediaAltText={mediaAltText}
                mediaUrl={mediaUrl}
                onRefresh={() => router.invalidate()}
                onStatePatch={setState}
                product={product}
                productMedia={productMedia}
            />
            <PriceSchedulingSection
                currencyCode={currencyCode}
                onRefresh={() => router.invalidate()}
                onStatePatch={setState}
                priceSchedules={priceSchedules}
                product={product}
                scheduleCostPrice={scheduleCostPrice}
                scheduleEffectiveAt={scheduleEffectiveAt}
                scheduleReason={scheduleReason}
                scheduleSellingPrice={scheduleSellingPrice}
            />
            <ChangeRequestsSection
                changeRequests={changeRequests}
                onRefresh={() => router.invalidate()}
            />
            <PriceHistorySection
                currencyCode={currencyCode}
                priceHistory={priceHistory}
            />
        </div>
    );
}
