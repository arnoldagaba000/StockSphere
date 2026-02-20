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
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { listSuppliers } from "@/features/suppliers/list-suppliers";

interface ProductEditLoaderData {
    categories: Awaited<ReturnType<typeof getCategories>>;
    changeRequests: Awaited<ReturnType<typeof listProductChangeRequests>>;
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
    if (!value) {
        return {};
    }

    try {
        return JSON.parse(value) as Record<string, string>;
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
        <Card>
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
                        <SelectTrigger>
                            <SelectValue placeholder="Supplier" />
                        </SelectTrigger>
                        <SelectContent>
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Supplier</TableHead>
                            <TableHead>Supplier SKU</TableHead>
                            <TableHead className="text-right">Action</TableHead>
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
                                            await unlinkSupplierFromProduct({
                                                data: {
                                                    productId: product.id,
                                                    supplierId:
                                                        supplierLink.supplierId,
                                                },
                                            });
                                            toast.success("Supplier unlinked.");
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
            </CardContent>
        </Card>
    );
};

interface VariantsSectionProps {
    onRefresh: () => Promise<void>;
    onStatePatch: (patch: Partial<EditProductPageState>) => void;
    product: ProductEditLoaderData["product"];
    variantAttributes: string;
    variantName: string;
    variantSku: string;
    variants: ProductEditLoaderData["variants"];
}

const VariantsSection = ({
    onRefresh,
    onStatePatch,
    product,
    variantAttributes,
    variantName,
    variantSku,
    variants,
}: VariantsSectionProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Variants</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                    <Input
                        onChange={(event) =>
                            onStatePatch({ variantName: event.target.value })
                        }
                        placeholder="Variant name"
                        value={variantName}
                    />
                    <Input
                        onChange={(event) =>
                            onStatePatch({ variantSku: event.target.value })
                        }
                        placeholder="Variant SKU"
                        value={variantSku}
                    />
                    <Input
                        onChange={(event) =>
                            onStatePatch({
                                variantAttributes: event.target.value,
                            })
                        }
                        placeholder='Attributes JSON e.g {"size":"M"}'
                        value={variantAttributes}
                    />
                    <Button
                        onClick={async () => {
                            const attributes =
                                parseVariantAttributes(variantAttributes);
                            if (!attributes) {
                                toast.error("Invalid variant attributes JSON.");
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {variants.map((variant) => (
                            <TableRow key={variant.id}>
                                <TableCell>{variant.name}</TableCell>
                                <TableCell>{variant.sku}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        onClick={async () => {
                                            await deleteProductVariant({
                                                data: {
                                                    id: variant.id,
                                                    productId: product.id,
                                                },
                                            });
                                            toast.success("Variant removed.");
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
        <Card>
            <CardHeader>
                <CardTitle>Media</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                    <Input
                        onChange={(event) =>
                            onStatePatch({ mediaUrl: event.target.value })
                        }
                        placeholder="https://image-url"
                        value={mediaUrl}
                    />
                    <Input
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
                <Table>
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
                                                await setPrimaryProductMedia({
                                                    data: {
                                                        mediaId: media.id,
                                                        productId: product.id,
                                                    },
                                                });
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
                                                        productId: product.id,
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
            </CardContent>
        </Card>
    );
};

interface PriceSchedulingSectionProps {
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
        <Card>
            <CardHeader>
                <CardTitle>Price Scheduling</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-4">
                    <Input
                        onChange={(event) =>
                            onStatePatch({
                                scheduleCostPrice: event.target.value,
                            })
                        }
                        placeholder="Cost price (UGX)"
                        step={1}
                        type="number"
                        value={scheduleCostPrice}
                    />
                    <Input
                        onChange={(event) =>
                            onStatePatch({
                                scheduleSellingPrice: event.target.value,
                            })
                        }
                        placeholder="Selling price (UGX)"
                        step={1}
                        type="number"
                        value={scheduleSellingPrice}
                    />
                    <Input
                        onChange={(event) =>
                            onStatePatch({
                                scheduleEffectiveAt: event.target.value,
                            })
                        }
                        type="datetime-local"
                        value={scheduleEffectiveAt}
                    />
                    <Input
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
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Effective At</TableHead>
                            <TableHead>Selling Price</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {priceSchedules.map((schedule) => (
                            <TableRow key={schedule.id}>
                                <TableCell>
                                    {formatUtcDateTime(schedule.effectiveAt)}
                                </TableCell>
                                <TableCell>
                                    {formatCurrencyFromMinorUnits(
                                        schedule.sellingPrice
                                    )}
                                </TableCell>
                                <TableCell>{schedule.status}</TableCell>
                                <TableCell className="text-right">
                                    <Button
                                        disabled={schedule.status !== "PENDING"}
                                        onClick={async () => {
                                            await cancelProductPriceSchedule({
                                                data: {
                                                    scheduleId: schedule.id,
                                                },
                                            });
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
        <Card>
            <CardHeader>
                <CardTitle>Pending Change Requests</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
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
            </CardContent>
        </Card>
    );
};

interface PriceHistorySectionProps {
    priceHistory: ProductEditLoaderData["priceHistory"];
}

const PriceHistorySection = ({ priceHistory }: PriceHistorySectionProps) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Price History</CardTitle>
            </CardHeader>
            <CardContent>
                <Table>
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
                                        entry.costPrice
                                    )}
                                </TableCell>
                                <TableCell>
                                    {formatCurrencyFromMinorUnits(
                                        entry.sellingPrice
                                    )}
                                </TableCell>
                                <TableCell>{entry.reason ?? "—"}</TableCell>
                                <TableCell>{entry.actorName}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
};

export const Route = createFileRoute("/_dashboard/products/$productId")({
    component: EditProductPage,
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
        ]);

        return {
            categories,
            changeRequests,
            priceHistory,
            priceSchedules,
            product,
            productMedia,
            productSuppliers,
            suppliers,
            variants,
        };
    },
});

function EditProductPage() {
    const navigate = useNavigate();
    const router = useRouter();
    const {
        categories,
        changeRequests,
        priceHistory,
        priceSchedules,
        product,
        productMedia,
        productSuppliers,
        suppliers,
        variants,
    } = Route.useLoaderData();
    const categoryOptions = buildCategoryHierarchy(categories);
    const [state, setState] = useReducer(editProductPageReducer, {
        isSubmitting: false,
        mediaAltText: "",
        mediaUrl: "",
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
        <div className="w-full space-y-4">
            <Card>
                <CardHeader>
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
            <PriceHistorySection priceHistory={priceHistory} />
        </div>
    );
}
