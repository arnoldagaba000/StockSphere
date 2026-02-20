import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { getApprovalInbox } from "@/features/approvals/get-approval-inbox";
import { approveAdjustmentRequest } from "@/features/inventory/approve-adjustment-request";
import { rejectAdjustmentRequest } from "@/features/inventory/reject-adjustment-request";
import {
    approveProductChangeRequest,
    rejectProductChangeRequest,
} from "@/features/products/manage-product-pricing";
import { approvePurchaseOrder } from "@/features/purchases/approve-purchase-order";
import { rejectPurchaseOrder } from "@/features/purchases/reject-purchase-order";

interface ApprovalsPageState {
    actionKey: string | null;
    rejectionReason: string;
}

const approvalsPageReducer = (
    state: ApprovalsPageState,
    patch: Partial<ApprovalsPageState>
): ApprovalsPageState => ({
    ...state,
    ...patch,
});

export const Route = createFileRoute("/_dashboard/approvals")({
    component: ApprovalsPage,
    loader: async () => await getApprovalInbox(),
});

function ApprovalsPage() {
    const router = useRouter();
    const data = Route.useLoaderData();
    const [state, setState] = useReducer(approvalsPageReducer, {
        actionKey: null,
        rejectionReason: "",
    });

    const runAction = async (
        actionKey: string,
        work: () => Promise<unknown>,
        successMessage: string
    ) => {
        try {
            setState({ actionKey });
            await work();
            toast.success(successMessage);
            await router.invalidate();
            setState({ actionKey: null });
        } catch (error) {
            setState({ actionKey: null });
            toast.error(
                error instanceof Error ? error.message : "Action failed."
            );
        }
    };

    return (
        <section className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Approval Inbox</CardTitle>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-3">
                    <SummaryCard
                        label="Pending Product Changes"
                        value={data.pendingProductChanges.length}
                    />
                    <SummaryCard
                        label="Submitted Purchase Orders"
                        value={data.submittedPurchaseOrders.length}
                    />
                    <SummaryCard
                        label="Adjustment Approval Requests"
                        value={data.pendingAdjustmentRequests.length}
                    />
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Product Change Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Created</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.pendingProductChanges.length === 0 ? (
                                <EmptyRow
                                    colSpan={5}
                                    text="No pending product changes."
                                />
                            ) : (
                                data.pendingProductChanges.map((request) => {
                                    const approveKey = `product-approve-${request.id}`;
                                    const rejectKey = `product-reject-${request.id}`;
                                    return (
                                        <TableRow key={request.id}>
                                            <TableCell>
                                                {new Date(
                                                    request.createdAt
                                                ).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Link
                                                    className="underline"
                                                    params={{
                                                        productId:
                                                            request.productId,
                                                    }}
                                                    to="/products/$productId"
                                                >
                                                    {request.product.sku} -{" "}
                                                    {request.product.name}
                                                </Link>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">
                                                    {request.changeType}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {request.requestedBy.name ??
                                                    request.requestedBy.email}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        disabled={
                                                            !data.capabilities
                                                                .canResolveProductChanges ||
                                                            state.actionKey ===
                                                                approveKey
                                                        }
                                                        onClick={() =>
                                                            runAction(
                                                                approveKey,
                                                                () =>
                                                                    approveProductChangeRequest(
                                                                        {
                                                                            data: {
                                                                                requestId:
                                                                                    request.id,
                                                                            },
                                                                        }
                                                                    ),
                                                                "Product change approved."
                                                            )
                                                        }
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        disabled={
                                                            !data.capabilities
                                                                .canResolveProductChanges ||
                                                            state.actionKey ===
                                                                rejectKey
                                                        }
                                                        onClick={() =>
                                                            runAction(
                                                                rejectKey,
                                                                () =>
                                                                    rejectProductChangeRequest(
                                                                        {
                                                                            data: {
                                                                                requestId:
                                                                                    request.id,
                                                                            },
                                                                        }
                                                                    ),
                                                                "Product change rejected."
                                                            )
                                                        }
                                                        size="sm"
                                                        variant="destructive"
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Inventory Adjustment Requests</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Created</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Warehouse</TableHead>
                                <TableHead>Requested By</TableHead>
                                <TableHead>Difference</TableHead>
                                <TableHead>Target Qty</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.pendingAdjustmentRequests.length === 0 ? (
                                <EmptyRow
                                    colSpan={7}
                                    text="No pending adjustment requests."
                                />
                            ) : (
                                data.pendingAdjustmentRequests.map(
                                    (request) => {
                                        const approveKey = `adjust-approve-${request.id}`;
                                        const rejectKey = `adjust-reject-${request.id}`;
                                        return (
                                            <TableRow key={request.id}>
                                                <TableCell>
                                                    {new Date(
                                                        request.createdAt
                                                    ).toLocaleString()}
                                                </TableCell>
                                                <TableCell>
                                                    {
                                                        request.stockItem
                                                            .product.sku
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        request.stockItem
                                                            .product.name
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {
                                                        request.stockItem
                                                            .warehouse.code
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        request.stockItem
                                                            .warehouse.name
                                                    }
                                                </TableCell>
                                                <TableCell>
                                                    {request.requestedBy.name ??
                                                        request.requestedBy
                                                            .email}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline">
                                                        {
                                                            request.requestedDifference
                                                        }
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    {request.countedQuantity}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            disabled={
                                                                !data
                                                                    .capabilities
                                                                    .canResolveAdjustments ||
                                                                state.actionKey ===
                                                                    approveKey
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    approveKey,
                                                                    () =>
                                                                        approveAdjustmentRequest(
                                                                            {
                                                                                data: {
                                                                                    requestId:
                                                                                        request.id,
                                                                                },
                                                                            }
                                                                        ),
                                                                    "Adjustment request approved."
                                                                )
                                                            }
                                                            size="sm"
                                                            variant="outline"
                                                        >
                                                            Approve
                                                        </Button>
                                                        <Button
                                                            disabled={
                                                                !data
                                                                    .capabilities
                                                                    .canResolveAdjustments ||
                                                                state.actionKey ===
                                                                    rejectKey
                                                            }
                                                            onClick={() =>
                                                                runAction(
                                                                    rejectKey,
                                                                    () =>
                                                                        rejectAdjustmentRequest(
                                                                            {
                                                                                data: {
                                                                                    reason:
                                                                                        state.rejectionReason ||
                                                                                        "Rejected from approval inbox",
                                                                                    requestId:
                                                                                        request.id,
                                                                                },
                                                                            }
                                                                        ),
                                                                    "Adjustment request rejected."
                                                                )
                                                            }
                                                            size="sm"
                                                            variant="destructive"
                                                        >
                                                            Reject
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    }
                                )
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Submitted Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Input
                        onChange={(event) =>
                            setState({
                                rejectionReason: event.target.value,
                            })
                        }
                        placeholder="Optional rejection reason"
                        value={state.rejectionReason}
                    />
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Created</TableHead>
                                <TableHead>Order #</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead>Created By</TableHead>
                                <TableHead>Total</TableHead>
                                <TableHead className="text-right">
                                    Actions
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.submittedPurchaseOrders.length === 0 ? (
                                <EmptyRow
                                    colSpan={6}
                                    text="No submitted purchase orders."
                                />
                            ) : (
                                data.submittedPurchaseOrders.map((order) => {
                                    const approveKey = `po-approve-${order.id}`;
                                    const rejectKey = `po-reject-${order.id}`;
                                    return (
                                        <TableRow key={order.id}>
                                            <TableCell>
                                                {new Date(
                                                    order.createdAt
                                                ).toLocaleString()}
                                            </TableCell>
                                            <TableCell>
                                                <Badge>
                                                    {order.orderNumber}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {order.supplier.code} -{" "}
                                                {order.supplier.name}
                                            </TableCell>
                                            <TableCell>
                                                {order.createdBy.name ??
                                                    order.createdBy.email}
                                            </TableCell>
                                            <TableCell>
                                                {formatCurrencyFromMinorUnits(
                                                    order.totalAmount
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        disabled={
                                                            !data.capabilities
                                                                .canResolvePurchaseOrders ||
                                                            state.actionKey ===
                                                                approveKey
                                                        }
                                                        onClick={() =>
                                                            runAction(
                                                                approveKey,
                                                                () =>
                                                                    approvePurchaseOrder(
                                                                        {
                                                                            data: {
                                                                                purchaseOrderId:
                                                                                    order.id,
                                                                            },
                                                                        }
                                                                    ),
                                                                "Purchase order approved."
                                                            )
                                                        }
                                                        size="sm"
                                                        variant="outline"
                                                    >
                                                        Approve
                                                    </Button>
                                                    <Button
                                                        disabled={
                                                            !data.capabilities
                                                                .canResolvePurchaseOrders ||
                                                            state.actionKey ===
                                                                rejectKey
                                                        }
                                                        onClick={() =>
                                                            runAction(
                                                                rejectKey,
                                                                () =>
                                                                    rejectPurchaseOrder(
                                                                        {
                                                                            data: {
                                                                                purchaseOrderId:
                                                                                    order.id,
                                                                                reason:
                                                                                    state.rejectionReason ||
                                                                                    undefined,
                                                                            },
                                                                        }
                                                                    ),
                                                                "Purchase order rejected."
                                                            )
                                                        }
                                                        size="sm"
                                                        variant="destructive"
                                                    >
                                                        Reject
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </section>
    );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
    return (
        <div className="rounded-md border p-3">
            <p className="font-medium text-sm">{label}</p>
            <p className="text-muted-foreground text-xs">{value} request(s)</p>
        </div>
    );
}

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
    return (
        <TableRow>
            <TableCell
                className="text-center text-muted-foreground"
                colSpan={colSpan}
            >
                {text}
            </TableCell>
        </TableRow>
    );
}
