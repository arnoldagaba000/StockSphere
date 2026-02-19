import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getWarehouses } from "@/features/inventory/get-warehouses";
import { getGoodsReceipts } from "@/features/purchases/get-goods-receipts";
import { getPurchaseOrders } from "@/features/purchases/get-purchase-orders";
import { receiveGoods } from "@/features/purchases/receive-goods";

export const Route = createFileRoute("/_dashboard/goods-receipts")({
    component: GoodsReceiptsPage,
    loader: async () => {
        const [receipts, purchaseOrders, warehouses] = await Promise.all([
            getGoodsReceipts({ data: {} }),
            getPurchaseOrders({ data: {} }),
            getWarehouses({ data: {} }),
        ]);

        return { purchaseOrders, receipts, warehouses };
    },
});

function GoodsReceiptsPage() {
    const router = useRouter();
    const { purchaseOrders, receipts, warehouses } = Route.useLoaderData();

    const receivableOrders = useMemo(
        () =>
            purchaseOrders.filter(
                (order) =>
                    order.status === "APPROVED" ||
                    order.status === "PARTIALLY_RECEIVED"
            ),
        [purchaseOrders]
    );

    const [purchaseOrderId, setPurchaseOrderId] = useState(
        receivableOrders[0]?.id ?? ""
    );
    const [warehouseId, setWarehouseId] = useState(warehouses[0]?.id ?? "");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const selectedOrder = receivableOrders.find(
        (order) => order.id === purchaseOrderId
    );

    const handleReceiveOutstanding = async () => {
        if (!(selectedOrder && warehouseId)) {
            toast.error("Select a purchase order and destination warehouse.");
            return;
        }

        const outstandingItems = selectedOrder.items
            .map((item) => ({
                productId: item.productId,
                quantity: item.quantity - item.receivedQuantity,
            }))
            .filter((item) => item.quantity > 0);

        if (outstandingItems.length === 0) {
            toast.error("No outstanding quantities remaining on this order.");
            return;
        }

        try {
            setIsSubmitting(true);
            await receiveGoods({
                data: {
                    items: outstandingItems.map((item) => ({
                        batchNumber: null,
                        expiryDate: null,
                        locationId: null,
                        productId: item.productId,
                        quantity: item.quantity,
                        serialNumber: null,
                        warehouseId,
                    })),
                    notes: null,
                    purchaseOrderId: selectedOrder.id,
                    receivedDate: new Date(),
                },
            });
            toast.success("Goods receipt posted.");
            await router.invalidate();
        } catch (error) {
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to receive goods."
            );
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Goods Receipts</h1>
                <p className="text-muted-foreground text-sm">
                    Receive approved purchase orders into warehouse stock.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Post Goods Receipt</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <div className="space-y-2 md:col-span-2">
                        <Label>Purchase Order</Label>
                        <Select
                            onValueChange={(value) =>
                                setPurchaseOrderId(value ?? "")
                            }
                            value={purchaseOrderId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select order" />
                            </SelectTrigger>
                            <SelectContent>
                                {receivableOrders.map((order) => (
                                    <SelectItem key={order.id} value={order.id}>
                                        {order.orderNumber} -{" "}
                                        {order.supplier.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label>Warehouse</Label>
                        <Select
                            onValueChange={(value) =>
                                setWarehouseId(value ?? "")
                            }
                            value={warehouseId}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Select warehouse" />
                            </SelectTrigger>
                            <SelectContent>
                                {warehouses.map((warehouse) => (
                                    <SelectItem
                                        key={warehouse.id}
                                        value={warehouse.id}
                                    >
                                        {warehouse.code} - {warehouse.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-3">
                        <Button
                            disabled={
                                isSubmitting ||
                                !selectedOrder ||
                                selectedOrder.items.every(
                                    (item) =>
                                        item.quantity <= item.receivedQuantity
                                )
                            }
                            onClick={handleReceiveOutstanding}
                        >
                            {isSubmitting
                                ? "Posting..."
                                : "Receive Outstanding Qty"}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Receipt History</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Receipt #</TableHead>
                                <TableHead>Purchase Order</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Lines</TableHead>
                                <TableHead>Received Date</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {receipts.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={5}
                                    >
                                        No goods receipts posted yet.
                                    </TableCell>
                                </TableRow>
                            ) : null}
                            {receipts.map((receipt) => (
                                <TableRow key={receipt.id}>
                                    <TableCell>
                                        {receipt.receiptNumber}
                                    </TableCell>
                                    <TableCell>
                                        {receipt.purchaseOrder?.orderNumber ??
                                            "—"}
                                    </TableCell>
                                    <TableCell>
                                        {receipt.purchaseOrder?.supplier.name ??
                                            "—"}
                                    </TableCell>
                                    <TableCell>
                                        {receipt.items.length}
                                    </TableCell>
                                    <TableCell>
                                        {new Date(
                                            receipt.receivedDate
                                        ).toLocaleDateString()}
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
