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
import {
    approveProductChangeRequest,
    rejectProductChangeRequest,
} from "@/features/products/manage-product-pricing";
import { approvePurchaseOrder } from "@/features/purchases/approve-purchase-order";
import { rejectPurchaseOrder } from "@/features/purchases/reject-purchase-order";

interface ApprovalsPageState {
    actionKey: string | null;
    purchaseOrderRejectReason: string;
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
        purchaseOrderRejectReason: "",
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
                <CardContent className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-md border p-3">
                        <p className="font-medium text-sm">
                            Pending Product Changes
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {data.pendingProductChanges.length} request(s)
                        </p>
                    </div>
                    <div className="rounded-md border p-3">
                        <p className="font-medium text-sm">
                            Submitted Purchase Orders
                        </p>
                        <p className="text-muted-foreground text-xs">
                            {data.submittedPurchaseOrders.length} request(s)
                        </p>
                    </div>
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
                                <TableRow>
                                    <TableCell
                                        className="text-center text-muted-foreground"
                                        colSpan={5}
                                    >
                                        No pending product changes.
                                    </TableCell>
                                </TableRow>
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
                    <CardTitle>Submitted Purchase Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                    <Input
                        onChange={(event) =>
                            setState({
                                purchaseOrderRejectReason: event.target.value,
                            })
                        }
                        placeholder="Optional rejection reason for purchase orders"
                        value={state.purchaseOrderRejectReason}
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
                                <TableRow>
                                    <TableCell
                                        className="text-center text-muted-foreground"
                                        colSpan={6}
                                    >
                                        No submitted purchase orders.
                                    </TableCell>
                                </TableRow>
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
                                                                                    state.purchaseOrderRejectReason ||
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
