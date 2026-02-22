import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useReducer } from "react";
import toast from "react-hot-toast";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import {
    RouteErrorFallback,
    RoutePendingFallback,
} from "@/components/layout/route-feedback";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

type ApprovalInboxData = Awaited<ReturnType<typeof getApprovalInbox>>;
type RunAction = (
    actionKey: string,
    work: () => Promise<unknown>,
    successMessage: string
) => Promise<void>;

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
    errorComponent: ApprovalsRouteError,
    loader: async () => {
        const [approvalInbox, financialSettings] = await Promise.all([
            getApprovalInbox(),
            getFinancialSettings(),
        ]);

        return {
            approvalInbox,
            financialSettings,
        };
    },
    pendingComponent: ApprovalsRoutePending,
});

function ApprovalsRoutePending() {
    return (
        <RoutePendingFallback
            subtitle="Loading approvals, pricing changes, and inventory requests."
            title="Loading Approvals"
        />
    );
}

function ApprovalsRouteError({
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
            title="Approvals failed to load"
            to="/"
        />
    );
}

function ApprovalsPage() {
    const router = useRouter();
    const { approvalInbox, financialSettings } = Route.useLoaderData();
    const { currencyCode } = financialSettings;
    const [state, setState] = useReducer(approvalsPageReducer, {
        actionKey: null,
        rejectionReason: "",
    });

    const runAction: RunAction = async (actionKey, work, successMessage) => {
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
            <ApprovalSummary data={approvalInbox} />
            <ProductChangeRequestsSection
                actionKey={state.actionKey}
                data={approvalInbox}
                runAction={runAction}
            />
            <AdjustmentRequestsSection
                actionKey={state.actionKey}
                data={approvalInbox}
                rejectionReason={state.rejectionReason}
                runAction={runAction}
            />
            <PurchaseOrdersSection
                actionKey={state.actionKey}
                currencyCode={currencyCode}
                data={approvalInbox}
                onRejectionReasonChange={(rejectionReason) =>
                    setState({ rejectionReason })
                }
                rejectionReason={state.rejectionReason}
                runAction={runAction}
            />
        </section>
    );
}

function ApprovalSummary({ data }: { data: ApprovalInboxData }) {
    return (
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
    );
}

function ProductChangeRequestsSection({
    actionKey,
    data,
    runAction,
}: {
    actionKey: string | null;
    data: ApprovalInboxData;
    runAction: RunAction;
}) {
    return (
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
                                                        actionKey === approveKey
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
                                                        actionKey === rejectKey
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
    );
}

function AdjustmentRequestsSection({
    actionKey,
    data,
    rejectionReason,
    runAction,
}: {
    actionKey: string | null;
    data: ApprovalInboxData;
    rejectionReason: string;
    runAction: RunAction;
}) {
    return (
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
                            data.pendingAdjustmentRequests.map((request) => {
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
                                            {request.stockItem.product.sku} -{" "}
                                            {request.stockItem.product.name}
                                        </TableCell>
                                        <TableCell>
                                            {request.stockItem.warehouse.code} -{" "}
                                            {request.stockItem.warehouse.name}
                                        </TableCell>
                                        <TableCell>
                                            {request.requestedBy.name ??
                                                request.requestedBy.email}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {request.requestedDifference}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            {request.countedQuantity}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    disabled={
                                                        !data.capabilities
                                                            .canResolveAdjustments ||
                                                        actionKey === approveKey
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
                                                        !data.capabilities
                                                            .canResolveAdjustments ||
                                                        actionKey === rejectKey
                                                    }
                                                    onClick={() =>
                                                        runAction(
                                                            rejectKey,
                                                            () =>
                                                                rejectAdjustmentRequest(
                                                                    {
                                                                        data: {
                                                                            reason:
                                                                                rejectionReason ||
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
                            })
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>
    );
}

function PurchaseOrdersSection({
    actionKey,
    currencyCode,
    data,
    onRejectionReasonChange,
    rejectionReason,
    runAction,
}: {
    actionKey: string | null;
    currencyCode: string;
    data: ApprovalInboxData;
    onRejectionReasonChange: (value: string) => void;
    rejectionReason: string;
    runAction: RunAction;
}) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Submitted Purchase Orders</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <div className="space-y-1">
                    <Label htmlFor="po-rejection-reason">
                        Rejection Reason (optional)
                    </Label>
                    <Input
                        id="po-rejection-reason"
                        onChange={(event) =>
                            onRejectionReasonChange(event.target.value)
                        }
                        placeholder="Enter why this purchase order is rejected"
                        value={rejectionReason}
                    />
                </div>
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
                                            <Badge>{order.orderNumber}</Badge>
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
                                                order.totalAmount,
                                                currencyCode
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    disabled={
                                                        !data.capabilities
                                                            .canResolvePurchaseOrders ||
                                                        actionKey === approveKey
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
                                                        actionKey === rejectKey
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
                                                                                rejectionReason ||
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
