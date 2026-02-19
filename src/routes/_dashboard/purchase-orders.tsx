import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
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
import { getProducts } from "@/features/products/get-products";
import { approvePurchaseOrder } from "@/features/purchases/approve-purchase-order";
import { createPurchaseOrder } from "@/features/purchases/create-purchase-order";
import { getPurchaseOrders } from "@/features/purchases/get-purchase-orders";
import { getSuppliers } from "@/features/purchases/get-suppliers";
import { rejectPurchaseOrder } from "@/features/purchases/reject-purchase-order";
import { submitPurchaseOrder } from "@/features/purchases/submit-purchase-order";

interface PurchaseOrderFormItem {
    id: string;
    productId: string;
    quantity: string;
    unitPrice: string;
}

const createLineItem = (productId: string): PurchaseOrderFormItem => ({
    id: crypto.randomUUID(),
    productId,
    quantity: "",
    unitPrice: "",
});

export const Route = createFileRoute("/_dashboard/purchase-orders")({
    component: PurchaseOrdersPage,
    loader: async () => {
        const [suppliers, productsResponse, purchaseOrders] = await Promise.all(
            [
                getSuppliers({ data: {} }),
                getProducts({ data: { pageSize: 200 } }),
                getPurchaseOrders({ data: {} }),
            ]
        );

        return {
            products: productsResponse.products,
            purchaseOrders,
            suppliers,
        };
    },
});

function PurchaseOrdersPage() {
    const router = useRouter();
    const { products, purchaseOrders, suppliers } = Route.useLoaderData();

    const [supplierId, setSupplierId] = useState(suppliers[0]?.id ?? "");
    const [expectedDate, setExpectedDate] = useState("");
    const [taxAmount, setTaxAmount] = useState("0");
    const [shippingCost, setShippingCost] = useState("0");
    const [items, setItems] = useState<PurchaseOrderFormItem[]>([
        createLineItem(products[0]?.id ?? ""),
    ]);
    const [isSaving, setIsSaving] = useState(false);
    const [isTransitioningId, setIsTransitioningId] = useState<string | null>(
        null
    );

    const subtotal = useMemo(
        () =>
            items.reduce((sum, item) => {
                const quantity = Number(item.quantity) || 0;
                const unitPrice = Number(item.unitPrice) || 0;
                return sum + quantity * unitPrice;
            }, 0),
        [items]
    );
    const total =
        subtotal + (Number(taxAmount) || 0) + (Number(shippingCost) || 0);

    const updateItem = (
        index: number,
        patch: Partial<PurchaseOrderFormItem>
    ): void => {
        setItems((currentItems) =>
            currentItems.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...patch } : item
            )
        );
    };

    const addLineItem = (): void => {
        setItems((currentItems) => [
            ...currentItems,
            createLineItem(products[0]?.id ?? ""),
        ]);
    };

    const removeLineItem = (index: number): void => {
        setItems((currentItems) => currentItems.filter((_, i) => i !== index));
    };

    const refreshData = async (): Promise<void> => {
        await router.invalidate();
    };

    const handleCreatePurchaseOrder = async () => {
        const normalizedItems = items
            .map((item) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                unitPrice: Number(item.unitPrice),
            }))
            .filter((item) => item.productId && item.quantity > 0);

        if (normalizedItems.length === 0) {
            toast.error("Add at least one valid line item.");
            return;
        }

        try {
            setIsSaving(true);
            await createPurchaseOrder({
                data: {
                    expectedDate: expectedDate ? new Date(expectedDate) : null,
                    items: normalizedItems.map((item) => ({
                        notes: null,
                        productId: item.productId,
                        quantity: item.quantity,
                        taxRate: 0,
                        unitPrice: item.unitPrice,
                    })),
                    notes: null,
                    shippingCost: Number(shippingCost) || 0,
                    supplierId,
                    taxAmount: Number(taxAmount) || 0,
                },
            });
            toast.success("Purchase order created.");
            setExpectedDate("");
            setTaxAmount("0");
            setShippingCost("0");
            setItems([createLineItem(products[0]?.id ?? "")]);
            await refreshData();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create purchase order."
            );
        } finally {
            setIsSaving(false);
        }
    };

    const transitionOrder = async (
        purchaseOrderId: string,
        action: "submit" | "approve" | "reject"
    ) => {
        try {
            setIsTransitioningId(purchaseOrderId);
            if (action === "submit") {
                await submitPurchaseOrder({ data: { purchaseOrderId } });
            } else if (action === "approve") {
                await approvePurchaseOrder({ data: { purchaseOrderId } });
            } else {
                await rejectPurchaseOrder({ data: { purchaseOrderId } });
            }
            toast.success(`Purchase order ${action}ed.`);
            await refreshData();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update order."
            );
        } finally {
            setIsTransitioningId(null);
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Purchase Orders</h1>
                <p className="text-muted-foreground text-sm">
                    Create and progress purchase orders from draft to approval.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create Purchase Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-3">
                        <div className="space-y-2">
                            <Label>Supplier</Label>
                            <Select
                                onValueChange={(value) =>
                                    setSupplierId(value ?? "")
                                }
                                value={supplierId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select supplier" />
                                </SelectTrigger>
                                <SelectContent>
                                    {suppliers.map((supplier) => (
                                        <SelectItem
                                            key={supplier.id}
                                            value={supplier.id}
                                        >
                                            {supplier.code} - {supplier.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="expected-date">Expected Date</Label>
                            <Input
                                id="expected-date"
                                onChange={(event) =>
                                    setExpectedDate(event.target.value)
                                }
                                type="date"
                                value={expectedDate}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax-amount">Tax (UGX)</Label>
                            <Input
                                id="tax-amount"
                                onChange={(event) =>
                                    setTaxAmount(event.target.value)
                                }
                                type="number"
                                value={taxAmount}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shipping-cost">
                                Shipping (UGX)
                            </Label>
                            <Input
                                id="shipping-cost"
                                onChange={(event) =>
                                    setShippingCost(event.target.value)
                                }
                                type="number"
                                value={shippingCost}
                            />
                        </div>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div
                                className="grid gap-3 md:grid-cols-4"
                                key={item.id}
                            >
                                <Select
                                    onValueChange={(value) =>
                                        updateItem(index, {
                                            productId: value ?? "",
                                        })
                                    }
                                    value={item.productId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map((product) => (
                                            <SelectItem
                                                key={product.id}
                                                value={product.id}
                                            >
                                                {product.sku} - {product.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Input
                                    onChange={(event) =>
                                        updateItem(index, {
                                            quantity: event.target.value,
                                        })
                                    }
                                    placeholder="Quantity"
                                    type="number"
                                    value={item.quantity}
                                />
                                <Input
                                    onChange={(event) =>
                                        updateItem(index, {
                                            unitPrice: event.target.value,
                                        })
                                    }
                                    placeholder="Unit price (UGX)"
                                    type="number"
                                    value={item.unitPrice}
                                />
                                <Button
                                    disabled={items.length <= 1}
                                    onClick={() => removeLineItem(index)}
                                    type="button"
                                    variant="outline"
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={addLineItem}
                            type="button"
                            variant="outline"
                        >
                            Add Line
                        </Button>
                        <p className="text-muted-foreground text-sm">
                            Subtotal: {formatCurrencyFromMinorUnits(subtotal)} |
                            Total: {formatCurrencyFromMinorUnits(total)}
                        </p>
                    </div>

                    <Button
                        disabled={isSaving || !supplierId}
                        onClick={handleCreatePurchaseOrder}
                    >
                        {isSaving ? "Creating..." : "Create Draft"}
                    </Button>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Purchase Order List</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order #</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Items</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {purchaseOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={6}
                                    >
                                        No purchase orders found.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {purchaseOrders.map((order) => (
                                <TableRow key={order.id}>
                                    <TableCell>{order.orderNumber}</TableCell>
                                    <TableCell>{order.supplier.name}</TableCell>
                                    <TableCell>{order.status}</TableCell>
                                    <TableCell>{order.items.length}</TableCell>
                                    <TableCell>
                                        {formatCurrencyFromMinorUnits(
                                            order.totalAmount
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex justify-end gap-2">
                                            {order.status === "DRAFT" ? (
                                                <Button
                                                    disabled={
                                                        isTransitioningId ===
                                                        order.id
                                                    }
                                                    onClick={() =>
                                                        transitionOrder(
                                                            order.id,
                                                            "submit"
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Submit
                                                </Button>
                                            ) : null}
                                            {order.status === "SUBMITTED" ? (
                                                <>
                                                    <Button
                                                        disabled={
                                                            isTransitioningId ===
                                                            order.id
                                                        }
                                                        onClick={() =>
                                                            transitionOrder(
                                                                order.id,
                                                                "approve"
                                                            )
                                                        }
                                                        size="sm"
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        disabled={
                                                            isTransitioningId ===
                                                            order.id
                                                        }
                                                        onClick={() =>
                                                            transitionOrder(
                                                                order.id,
                                                                "reject"
                                                            )
                                                        }
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        Reject
                                                    </Button>
                                                </>
                                            ) : null}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}
