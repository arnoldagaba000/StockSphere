import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getProducts } from "@/features/products/get-products";
import {
    linkSupplierToProduct,
    unlinkSupplierFromProduct,
} from "@/features/products/manage-product-suppliers";
import { getSupplier } from "@/features/purchases/get-supplier";
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

const SHORT_ID_LENGTH = 8;

interface SupplierLinkFormState {
    costPrice: string;
    isLinking: boolean;
    isPreferred: boolean;
    leadTimeDays: string;
    minimumOrderQty: string;
    productId: string;
    supplierSku: string;
    unlinkingProductId: string | null;
}

export const Route = createFileRoute("/_dashboard/suppliers/$supplierId")({
    component: SupplierDetailPage,
    loader: async ({ params }) => {
        const [productsResponse, supplier, financialSettings] =
            await Promise.all([
                getProducts({ data: { isActive: true, pageSize: 200 } }),
                getSupplier({
                    data: {
                        id: params.supplierId,
                    },
                }),
                getFinancialSettings(),
            ]);

        return {
            financialSettings,
            products: productsResponse.products,
            supplier,
        };
    },
});

function SupplierDetailPage() {
    const router = useRouter();
    const { financialSettings, products, supplier } = Route.useLoaderData();
    const [linkState, patchLinkState] = useReducer(
        (
            state: SupplierLinkFormState,
            patch: Partial<SupplierLinkFormState>
        ): SupplierLinkFormState => ({
            ...state,
            ...patch,
        }),
        {
            costPrice: "",
            isLinking: false,
            isPreferred: false,
            leadTimeDays: "",
            minimumOrderQty: "",
            productId: products[0]?.id ?? "",
            supplierSku: "",
            unlinkingProductId: null,
        }
    );

    const linkedProductIds = useMemo(
        () =>
            new Set(
                supplier.products.map((productLink) => productLink.productId)
            ),
        [supplier.products]
    );

    const availableProducts = useMemo(
        () => products.filter((product) => !linkedProductIds.has(product.id)),
        [linkedProductIds, products]
    );

    const selectedAvailableProduct = useMemo(
        () =>
            availableProducts.find(
                (product) => product.id === linkState.productId
            ) ?? availableProducts[0],
        [availableProducts, linkState.productId]
    );

    const refresh = async (): Promise<void> => {
        await router.invalidate();
    };

    const handleLinkProduct = async (): Promise<void> => {
        const productId = selectedAvailableProduct?.id ?? linkState.productId;
        if (!productId) {
            toast.error("No unlinked products are available.");
            return;
        }

        try {
            patchLinkState({ isLinking: true });
            await linkSupplierToProduct({
                data: {
                    costPrice:
                        linkState.costPrice.trim().length > 0
                            ? Number(linkState.costPrice)
                            : null,
                    isPreferred: linkState.isPreferred,
                    leadTimeDays:
                        linkState.leadTimeDays.trim().length > 0
                            ? Number(linkState.leadTimeDays)
                            : null,
                    minimumOrderQty:
                        linkState.minimumOrderQty.trim().length > 0
                            ? Number(linkState.minimumOrderQty)
                            : null,
                    productId,
                    supplierId: supplier.id,
                    supplierSku:
                        linkState.supplierSku.trim().length > 0
                            ? linkState.supplierSku.trim()
                            : null,
                },
            });
            toast.success("Product linked to supplier.");
            patchLinkState({
                costPrice: "",
                isLinking: false,
                isPreferred: false,
                leadTimeDays: "",
                minimumOrderQty: "",
                productId: "",
                supplierSku: "",
            });
            await refresh();
        } catch (error) {
            patchLinkState({ isLinking: false });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to link product."
            );
        }
    };

    const handleUnlinkProduct = async (productId: string): Promise<void> => {
        try {
            patchLinkState({ unlinkingProductId: productId });
            await unlinkSupplierFromProduct({
                data: {
                    productId,
                    supplierId: supplier.id,
                },
            });
            toast.success("Product unlinked from supplier.");
            await refresh();
            patchLinkState({ unlinkingProductId: null });
        } catch (error) {
            patchLinkState({ unlinkingProductId: null });
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to unlink product."
            );
        }
    };

    return (
        <section className="w-full space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-1">
                    <h1 className="font-semibold text-2xl">{supplier.name}</h1>
                    <p className="text-muted-foreground text-sm">
                        Supplier detail view
                    </p>
                </div>
                <Button
                    nativeButton={false}
                    render={<Link to="/suppliers" />}
                    variant="outline"
                >
                    Back to Suppliers
                </Button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Code
                        </p>
                        <p className="font-semibold text-xl">{supplier.code}</p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Products
                        </p>
                        <p className="font-semibold text-2xl">
                            {supplier._count.products}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Purchase Orders
                        </p>
                        <p className="font-semibold text-2xl">
                            {supplier._count.purchaseOrders}
                        </p>
                    </CardContent>
                </Card>
                <Card className="border-border/70">
                    <CardContent className="space-y-1 p-4">
                        <p className="text-muted-foreground text-xs uppercase tracking-wide">
                            Status
                        </p>
                        <Badge
                            variant={supplier.isActive ? "secondary" : "ghost"}
                        >
                            {supplier.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </CardContent>
                </Card>
            </div>

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                    <p>
                        <span className="text-muted-foreground">ID:</span>{" "}
                        <span className="font-mono">
                            {supplier.id.slice(0, SHORT_ID_LENGTH)}
                        </span>
                    </p>
                    <p>
                        <span className="text-muted-foreground">Contact:</span>{" "}
                        {supplier.contactPerson ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Email:</span>{" "}
                        {supplier.email ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">Phone:</span>{" "}
                        {supplier.phone ?? "\u2014"}
                    </p>
                    <p>
                        <span className="text-muted-foreground">
                            Payment Terms:
                        </span>{" "}
                        {supplier.paymentTerms ?? "\u2014"}
                    </p>
                </CardContent>
            </Card>

            <Card className="border-border/70">
                <CardHeader className="space-y-1">
                    <CardTitle>Supplier Products</CardTitle>
                    <p className="text-muted-foreground text-sm">
                        Link products to this supplier outside product creation.
                    </p>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2 lg:col-span-2">
                            <Label htmlFor="supplier-link-product">
                                Product
                            </Label>
                            <select
                                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                                id="supplier-link-product"
                                onChange={(event) =>
                                    patchLinkState({
                                        productId: event.target.value,
                                    })
                                }
                                value={selectedAvailableProduct?.id ?? ""}
                            >
                                {availableProducts.length === 0 ? (
                                    <option value="">
                                        No unlinked products
                                    </option>
                                ) : (
                                    availableProducts.map((product) => (
                                        <option
                                            key={product.id}
                                            value={product.id}
                                        >
                                            {product.sku} - {product.name}
                                        </option>
                                    ))
                                )}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier-sku">Supplier SKU</Label>
                            <Input
                                id="supplier-sku"
                                onChange={(event) =>
                                    patchLinkState({
                                        supplierSku: event.target.value,
                                    })
                                }
                                placeholder="Optional"
                                value={linkState.supplierSku}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier-cost-price">
                                Cost Price
                            </Label>
                            <Input
                                id="supplier-cost-price"
                                min={0}
                                onChange={(event) =>
                                    patchLinkState({
                                        costPrice: event.target.value,
                                    })
                                }
                                placeholder="Optional"
                                type="number"
                                value={linkState.costPrice}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier-lead-time">
                                Lead Time (days)
                            </Label>
                            <Input
                                id="supplier-lead-time"
                                min={0}
                                onChange={(event) =>
                                    patchLinkState({
                                        leadTimeDays: event.target.value,
                                    })
                                }
                                placeholder="Optional"
                                type="number"
                                value={linkState.leadTimeDays}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="supplier-min-qty">
                                Min Order Qty
                            </Label>
                            <Input
                                id="supplier-min-qty"
                                min={0}
                                onChange={(event) =>
                                    patchLinkState({
                                        minimumOrderQty: event.target.value,
                                    })
                                }
                                placeholder="Optional"
                                type="number"
                                value={linkState.minimumOrderQty}
                            />
                        </div>
                        <div className="flex items-end gap-2 pb-2">
                            <Switch
                                checked={linkState.isPreferred}
                                id="supplier-is-preferred"
                                onCheckedChange={(checked) =>
                                    patchLinkState({
                                        isPreferred: checked,
                                    })
                                }
                            />
                            <Label htmlFor="supplier-is-preferred">
                                Preferred supplier for product
                            </Label>
                        </div>
                    </div>
                    <Button
                        disabled={
                            linkState.isLinking ||
                            availableProducts.length === 0 ||
                            !(
                                selectedAvailableProduct?.id ??
                                linkState.productId
                            )
                        }
                        onClick={() => {
                            handleLinkProduct().catch(() => undefined);
                        }}
                    >
                        {linkState.isLinking ? "Linking..." : "Link Product"}
                    </Button>

                    <div className="overflow-x-auto rounded-md border">
                        <Table className="min-w-[980px]">
                            <TableHeader>
                                <TableRow>
                                    <TableHead>SKU</TableHead>
                                    <TableHead>Product</TableHead>
                                    <TableHead>Supplier SKU</TableHead>
                                    <TableHead>Cost Price</TableHead>
                                    <TableHead>Lead Time</TableHead>
                                    <TableHead>Min Qty</TableHead>
                                    <TableHead>Preferred</TableHead>
                                    <TableHead className="text-right">
                                        Actions
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {supplier.products.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            className="text-muted-foreground"
                                            colSpan={8}
                                        >
                                            No linked products yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    supplier.products.map((productLink) => (
                                        <TableRow key={productLink.id}>
                                            <TableCell>
                                                {productLink.product.sku}
                                            </TableCell>
                                            <TableCell>
                                                {productLink.product.name}
                                            </TableCell>
                                            <TableCell>
                                                {productLink.supplierSku ??
                                                    "\u2014"}
                                            </TableCell>
                                            <TableCell>
                                                {productLink.costPrice == null
                                                    ? "\u2014"
                                                    : formatCurrencyFromMinorUnits(
                                                          productLink.costPrice,
                                                          financialSettings.currencyCode
                                                      )}
                                            </TableCell>
                                            <TableCell>
                                                {productLink.leadTimeDays ==
                                                null
                                                    ? "\u2014"
                                                    : `${productLink.leadTimeDays} days`}
                                            </TableCell>
                                            <TableCell>
                                                {productLink.minimumOrderQty ??
                                                    "\u2014"}
                                            </TableCell>
                                            <TableCell>
                                                {productLink.isPreferred
                                                    ? "Yes"
                                                    : "No"}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    disabled={
                                                        linkState.unlinkingProductId ===
                                                        productLink.productId
                                                    }
                                                    onClick={() => {
                                                        handleUnlinkProduct(
                                                            productLink.productId
                                                        ).catch(
                                                            () => undefined
                                                        );
                                                    }}
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    {linkState.unlinkingProductId ===
                                                    productLink.productId
                                                        ? "Removing..."
                                                        : "Unlink"}
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

            <Card className="border-border/70">
                <CardHeader>
                    <CardTitle>Recent Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                    <Table className="min-w-[760px]">
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Total
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {supplier.purchaseOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={4}
                                    >
                                        No purchase orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                supplier.purchaseOrders.map((order) => (
                                    <TableRow key={order.id}>
                                        <TableCell>
                                            {order.orderNumber}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(
                                                order.orderDate
                                            ).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>{order.status}</TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrencyFromMinorUnits(
                                                order.totalAmount,
                                                financialSettings.currencyCode
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}
