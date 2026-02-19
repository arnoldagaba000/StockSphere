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
    trackByBatch: product.trackByBatch,
    trackByExpiry: product.trackByExpiry,
    trackBySerialNumber: product.trackBySerialNumber,
    unit: product.unit,
    weight: product.weight ?? "",
    weightUnit: product.weightUnit ?? "",
});

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
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [supplierId, setSupplierId] = useState("none");
    const [supplierSku, setSupplierSku] = useState("");
    const [variantName, setVariantName] = useState("");
    const [variantSku, setVariantSku] = useState("");
    const [variantAttributes, setVariantAttributes] = useState("");
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaAltText, setMediaAltText] = useState("");
    const [scheduleCostPrice, setScheduleCostPrice] = useState("");
    const [scheduleSellingPrice, setScheduleSellingPrice] = useState("");
    const [scheduleEffectiveAt, setScheduleEffectiveAt] = useState("");
    const [scheduleReason, setScheduleReason] = useState("");

    const handleSubmit = async (formData: ProductSubmitData) => {
        try {
            setIsSubmitting(true);
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
                setIsSubmitting(false);
                return;
            }

            toast.success("Product updated.");
            await navigate({ to: "/products" });
            setIsSubmitting(false);
        } catch (error) {
            setIsSubmitting(false);
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

            <Card>
                <CardHeader>
                    <CardTitle>Supplier Links</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <Select
                            onValueChange={(value) =>
                                setSupplierId(value ?? "none")
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
                                setSupplierSku(event.target.value)
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
                                setSupplierId("none");
                                setSupplierSku("");
                                await router.invalidate();
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
                                                await router.invalidate();
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

            <Card>
                <CardHeader>
                    <CardTitle>Variants</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-4">
                        <Input
                            onChange={(event) =>
                                setVariantName(event.target.value)
                            }
                            placeholder="Variant name"
                            value={variantName}
                        />
                        <Input
                            onChange={(event) =>
                                setVariantSku(event.target.value)
                            }
                            placeholder="Variant SKU"
                            value={variantSku}
                        />
                        <Input
                            onChange={(event) =>
                                setVariantAttributes(event.target.value)
                            }
                            placeholder='Attributes JSON e.g {"size":"M"}'
                            value={variantAttributes}
                        />
                        <Button
                            onClick={async () => {
                                const attributes =
                                    parseVariantAttributes(variantAttributes);
                                if (!attributes) {
                                    toast.error(
                                        "Invalid variant attributes JSON."
                                    );
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
                                setVariantName("");
                                setVariantSku("");
                                setVariantAttributes("");
                                await router.invalidate();
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
                                <TableHead className="text-right">
                                    Action
                                </TableHead>
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
                                                toast.success(
                                                    "Variant removed."
                                                );
                                                await router.invalidate();
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

            <Card>
                <CardHeader>
                    <CardTitle>Media</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-3">
                        <Input
                            onChange={(event) =>
                                setMediaUrl(event.target.value)
                            }
                            placeholder="https://image-url"
                            value={mediaUrl}
                        />
                        <Input
                            onChange={(event) =>
                                setMediaAltText(event.target.value)
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
                                setMediaUrl("");
                                setMediaAltText("");
                                await router.invalidate();
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
                                                    await router.invalidate();
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
                                                    await router.invalidate();
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

            <Card>
                <CardHeader>
                    <CardTitle>Price Scheduling</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-4">
                        <Input
                            onChange={(event) =>
                                setScheduleCostPrice(event.target.value)
                            }
                            placeholder="Cost price (UGX)"
                            step={1}
                            type="number"
                            value={scheduleCostPrice}
                        />
                        <Input
                            onChange={(event) =>
                                setScheduleSellingPrice(event.target.value)
                            }
                            placeholder="Selling price (UGX)"
                            step={1}
                            type="number"
                            value={scheduleSellingPrice}
                        />
                        <Input
                            onChange={(event) =>
                                setScheduleEffectiveAt(event.target.value)
                            }
                            type="datetime-local"
                            value={scheduleEffectiveAt}
                        />
                        <Input
                            onChange={(event) =>
                                setScheduleReason(event.target.value)
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
                                        effectiveAt: new Date(
                                            scheduleEffectiveAt
                                        ),
                                        productId: product.id,
                                        reason:
                                            scheduleReason.trim().length > 0
                                                ? scheduleReason
                                                : null,
                                        sellingPrice:
                                            scheduleSellingPrice.trim().length >
                                            0
                                                ? Number(scheduleSellingPrice)
                                                : null,
                                    },
                                });
                                toast.success("Price schedule created.");
                                setScheduleCostPrice("");
                                setScheduleSellingPrice("");
                                setScheduleEffectiveAt("");
                                setScheduleReason("");
                                await router.invalidate();
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
                                await router.invalidate();
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
                                            schedule.sellingPrice
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
                                                await router.invalidate();
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
                                                    await router.invalidate();
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
                                                    await router.invalidate();
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
        </div>
    );
}
