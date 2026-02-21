import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useReducer } from "react";
import toast from "react-hot-toast";
import { formatCurrencyFromMinorUnits } from "@/components/features/products/utils";
import { Badge } from "@/components/ui/badge";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { getCustomers } from "@/features/customers/get-customers";
import { getProducts } from "@/features/products/get-products";
import { cancelSalesOrder } from "@/features/sales/cancel-sales-order";
import { confirmSalesOrder } from "@/features/sales/confirm-sales-order";
import { createSalesOrder } from "@/features/sales/create-sales-order";
import { deleteSalesOrderDraft } from "@/features/sales/delete-sales-order-draft";
import type { SalesOrderDetailResponse } from "@/features/sales/get-sales-order-detail";
import { getSalesOrderDetail } from "@/features/sales/get-sales-order-detail";
import type {
    SalesOrderListItem,
    SalesOrdersListResponse,
} from "@/features/sales/get-sales-orders";
import { getSalesOrders } from "@/features/sales/get-sales-orders";
import { markSalesOrderDelivered } from "@/features/sales/mark-sales-order-delivered";
import { shipOrder } from "@/features/sales/ship-order";
import { updateSalesOrderDraft } from "@/features/sales/update-sales-order-draft";
import { getFinancialSettings } from "@/features/settings/get-financial-settings";

interface SalesOrderLineItemFormState {
    id: string;
    productId: string;
    quantity: string;
    taxRate: string;
    unitPrice: string;
}

interface ShipmentLineFormState {
    orderItemId: string;
    quantity: string;
    stockItemId: string;
}

interface SalesListFilters {
    customerId: string;
    dateFrom: string;
    dateTo: string;
    search: string;
    status: string;
}

const getDefaultSalesUnitPrice = (
    products: Awaited<ReturnType<typeof getProducts>>["products"],
    productId: string
): string => {
    const product = products.find((entry) => entry.id === productId);
    if (!product || product.sellingPrice == null) {
        return "";
    }
    return String(product.sellingPrice);
};

const getCustomerDefaultShippingAddress = (
    customers: Awaited<ReturnType<typeof getCustomers>>,
    customerId: string
): string => {
    const customer = customers.find((entry) => entry.id === customerId);
    return customer?.address?.trim() ?? "";
};

const createSalesLineItem = (
    products: Awaited<ReturnType<typeof getProducts>>["products"],
    productId: string,
    defaultTaxRatePercent: number
): SalesOrderLineItemFormState => ({
    id: crypto.randomUUID(),
    productId,
    quantity: "",
    taxRate: String(defaultTaxRatePercent),
    unitPrice: getDefaultSalesUnitPrice(products, productId),
});

const createShipmentLine = (
    orderItemId: string,
    stockItemId: string,
    quantity: number
): ShipmentLineFormState => ({
    orderItemId,
    quantity: quantity > 0 ? String(quantity) : "",
    stockItemId,
});

const emptyFilters: SalesListFilters = {
    customerId: "",
    dateFrom: "",
    dateTo: "",
    search: "",
    status: "",
};

interface SalesOrdersPageState {
    cancelReason: string;
    customerId: string;
    draftLines: SalesOrderLineItemFormState[];
    draftNotes: string;
    draftRequiredDate: string;
    draftShippingAddress: string;
    draftShippingCost: string;
    draftTaxAmount: string;
    isActionBusyId: string | null;
    isCreating: boolean;
    isLoadingDetail: boolean;
    isLoadingOrders: boolean;
    isSavingDraft: boolean;
    isShipping: boolean;
    items: SalesOrderLineItemFormState[];
    listFilters: SalesListFilters;
    requiredDate: string;
    salesOrdersResponse: SalesOrdersListResponse;
    selectedOrderDetail: SalesOrderDetailResponse | null;
    selectedOrderId: string | null;
    shipmentCarrier: string;
    shipmentLines: ShipmentLineFormState[];
    shipmentTrackingNumber: string;
    shippingAddress: string;
    shippingAddressSourceCustomerId: string | null;
    shippingCost: string;
    taxAmount: string;
}

type SalesOrdersPageAction =
    | Partial<SalesOrdersPageState>
    | ((state: SalesOrdersPageState) => Partial<SalesOrdersPageState>);

const salesOrdersPageReducer = (
    state: SalesOrdersPageState,
    action: SalesOrdersPageAction
): SalesOrdersPageState => {
    const patch = typeof action === "function" ? action(state) : action;
    return {
        ...state,
        ...patch,
    };
};

const buildSalesOrdersQuery = (
    filters: SalesListFilters,
    page: number
): Parameters<typeof getSalesOrders>[0] => ({
    data: {
        customerId: filters.customerId || undefined,
        dateFrom: filters.dateFrom ? new Date(filters.dateFrom) : undefined,
        dateTo: filters.dateTo ? new Date(filters.dateTo) : undefined,
        page,
        pageSize: 20,
        search: filters.search.trim() || undefined,
        status:
            filters.status.length > 0
                ? (filters.status as
                      | "CANCELLED"
                      | "CONFIRMED"
                      | "DELIVERED"
                      | "DRAFT"
                      | "FULFILLED"
                      | "PARTIALLY_FULFILLED"
                      | "SHIPPED")
                : undefined,
    },
});

export const Route = createFileRoute("/_dashboard/sales-orders")({
    component: SalesOrdersPage,
    loader: async () => {
        const [
            customers,
            financialSettings,
            productsResponse,
            initialSalesOrders,
        ] = await Promise.all([
            getCustomers({ data: { isActive: true } }),
            getFinancialSettings(),
            getProducts({ data: { isActive: true, pageSize: 200 } }),
            getSalesOrders(buildSalesOrdersQuery(emptyFilters, 1)),
        ]);

        return {
            customers,
            financialSettings,
            initialSalesOrders,
            products: productsResponse.products,
        };
    },
});

const useSalesOrdersPageController = (
    loaderData: ReturnType<typeof Route.useLoaderData>
) => {
    const { customers, financialSettings, initialSalesOrders, products } =
        loaderData;
    const initialCustomerId = customers[0]?.id ?? "";
    const initialShippingAddress = getCustomerDefaultShippingAddress(
        customers,
        initialCustomerId
    );
    const [state, patchState] = useReducer(salesOrdersPageReducer, {
        cancelReason: "",
        customerId: initialCustomerId,
        draftLines: [],
        draftNotes: "",
        draftRequiredDate: "",
        draftShippingAddress: "",
        draftShippingCost: "0",
        draftTaxAmount: "0",
        isActionBusyId: null,
        isCreating: false,
        isLoadingDetail: false,
        isLoadingOrders: false,
        isSavingDraft: false,
        isShipping: false,
        items: [
            createSalesLineItem(
                products,
                products[0]?.id ?? "",
                financialSettings.defaultTaxRatePercent
            ),
        ],
        listFilters: emptyFilters,
        requiredDate: "",
        salesOrdersResponse: initialSalesOrders,
        selectedOrderDetail: null,
        selectedOrderId: null,
        shipmentCarrier: "",
        shipmentLines: [],
        shipmentTrackingNumber: "",
        shippingAddress: initialShippingAddress,
        shippingAddressSourceCustomerId: initialCustomerId || null,
        shippingCost: "0",
        taxAmount: "0",
    });
    const {
        cancelReason,
        customerId,
        draftLines,
        draftNotes,
        draftRequiredDate,
        draftShippingAddress,
        draftShippingCost,
        draftTaxAmount,
        isActionBusyId,
        isCreating,
        isLoadingDetail,
        isLoadingOrders,
        isSavingDraft,
        isShipping,
        items,
        listFilters,
        requiredDate,
        salesOrdersResponse,
        selectedOrderDetail,
        selectedOrderId,
        shipmentCarrier,
        shipmentLines,
        shipmentTrackingNumber,
        shippingAddress,
        shippingCost,
        taxAmount,
    } = state;

    const setCustomerId = (value: string): void => {
        patchState((currentState) => {
            const nextDefaultAddress = getCustomerDefaultShippingAddress(
                customers,
                value
            );
            const shouldReplaceAddress =
                currentState.shippingAddress.trim().length === 0 ||
                currentState.shippingAddressSourceCustomerId ===
                    currentState.customerId;

            if (!shouldReplaceAddress) {
                return { customerId: value };
            }

            return {
                customerId: value,
                shippingAddress: nextDefaultAddress,
                shippingAddressSourceCustomerId: value || null,
            };
        });
    };
    const setRequiredDate = (value: string): void => {
        patchState({ requiredDate: value });
    };
    const setShippingAddress = (value: string): void => {
        patchState({
            shippingAddress: value,
            shippingAddressSourceCustomerId: null,
        });
    };
    const setTaxAmount = (value: string): void => {
        patchState({ taxAmount: value });
    };
    const setShippingCost = (value: string): void => {
        patchState({ shippingCost: value });
    };
    const setItems = (
        next:
            | SalesOrderLineItemFormState[]
            | ((
                  current: SalesOrderLineItemFormState[]
              ) => SalesOrderLineItemFormState[])
    ): void => {
        patchState((currentState) => ({
            items: typeof next === "function" ? next(currentState.items) : next,
        }));
    };
    const setListFilters = (
        next:
            | SalesListFilters
            | ((current: SalesListFilters) => SalesListFilters)
    ): void => {
        patchState((currentState) => ({
            listFilters:
                typeof next === "function"
                    ? next(currentState.listFilters)
                    : next,
        }));
    };
    const setSalesOrdersResponse = (value: SalesOrdersListResponse): void => {
        patchState({ salesOrdersResponse: value });
    };
    const setIsLoadingOrders = (value: boolean): void => {
        patchState({ isLoadingOrders: value });
    };
    const setSelectedOrderId = (value: string | null): void => {
        patchState({ selectedOrderId: value });
    };
    const setSelectedOrderDetail = (
        value: SalesOrderDetailResponse | null
    ): void => {
        patchState({ selectedOrderDetail: value });
    };
    const setShipmentLines = (
        next:
            | ShipmentLineFormState[]
            | ((current: ShipmentLineFormState[]) => ShipmentLineFormState[])
    ): void => {
        patchState((currentState) => ({
            shipmentLines:
                typeof next === "function"
                    ? next(currentState.shipmentLines)
                    : next,
        }));
    };
    const setShipmentCarrier = (value: string): void => {
        patchState({ shipmentCarrier: value });
    };
    const setShipmentTrackingNumber = (value: string): void => {
        patchState({ shipmentTrackingNumber: value });
    };
    const setCancelReason = (value: string): void => {
        patchState({ cancelReason: value });
    };
    const setDraftNotes = (value: string): void => {
        patchState({ draftNotes: value });
    };
    const setDraftRequiredDate = (value: string): void => {
        patchState({ draftRequiredDate: value });
    };
    const setDraftShippingAddress = (value: string): void => {
        patchState({ draftShippingAddress: value });
    };
    const setDraftTaxAmount = (value: string): void => {
        patchState({ draftTaxAmount: value });
    };
    const setDraftShippingCost = (value: string): void => {
        patchState({ draftShippingCost: value });
    };
    const setDraftLines = (
        next:
            | SalesOrderLineItemFormState[]
            | ((
                  current: SalesOrderLineItemFormState[]
              ) => SalesOrderLineItemFormState[])
    ): void => {
        patchState((currentState) => ({
            draftLines:
                typeof next === "function"
                    ? next(currentState.draftLines)
                    : next,
        }));
    };
    const setIsCreating = (value: boolean): void => {
        patchState({ isCreating: value });
    };
    const setIsLoadingDetail = (value: boolean): void => {
        patchState({ isLoadingDetail: value });
    };
    const setIsActionBusyId = (value: string | null): void => {
        patchState({ isActionBusyId: value });
    };
    const setIsShipping = (value: boolean): void => {
        patchState({ isShipping: value });
    };
    const setIsSavingDraft = (value: boolean): void => {
        patchState({ isSavingDraft: value });
    };

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

    const buildDefaultShipmentLines = (
        detail: SalesOrderDetailResponse
    ): ShipmentLineFormState[] => {
        return detail.items
            .map((item) => {
                const remainingQuantity = item.quantity - item.shippedQuantity;
                const bucket = detail.stockBuckets.find(
                    (stockBucket) =>
                        stockBucket.productId === item.productId &&
                        stockBucket.availableQuantity > 0
                );

                return createShipmentLine(
                    item.id,
                    bucket?.id ?? "",
                    Math.max(0, remainingQuantity)
                );
            })
            .filter((line) => line.stockItemId.length > 0);
    };

    const setDraftFromDetail = (detail: SalesOrderDetailResponse) => {
        setDraftNotes(detail.notes ?? "");
        setDraftRequiredDate(
            detail.requiredDate
                ? new Date(detail.requiredDate).toISOString().slice(0, 10)
                : ""
        );
        setDraftShippingAddress(detail.shippingAddress ?? "");
        setDraftTaxAmount(String(detail.taxAmount));
        setDraftShippingCost(String(detail.shippingCost));
        setDraftLines(
            detail.items.map((item) => ({
                id: item.id,
                productId: item.productId,
                quantity: String(item.quantity),
                taxRate: String(item.taxRate),
                unitPrice: String(item.unitPrice),
            }))
        );
    };

    const loadOrderDetail = async (orderId: string): Promise<void> => {
        try {
            setIsLoadingDetail(true);
            setSelectedOrderId(orderId);
            const detail = (await getSalesOrderDetail({
                data: { salesOrderId: orderId },
            })) as SalesOrderDetailResponse;
            setSelectedOrderDetail(detail);
            setShipmentLines(buildDefaultShipmentLines(detail));
            if (detail.status === "DRAFT") {
                setDraftFromDetail(detail);
            }
            setIsLoadingDetail(false);
        } catch (error) {
            setIsLoadingDetail(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load sales order detail."
            );
        }
    };

    const loadSalesOrders = async (page = 1): Promise<void> => {
        try {
            setIsLoadingOrders(true);
            const response = await getSalesOrders(
                buildSalesOrdersQuery(listFilters, page)
            );
            setSalesOrdersResponse(response);
            setIsLoadingOrders(false);
        } catch (error) {
            setIsLoadingOrders(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to load sales orders."
            );
        }
    };

    const refresh = async (): Promise<void> => {
        await loadSalesOrders(salesOrdersResponse.pagination.page);
        if (selectedOrderId) {
            await loadOrderDetail(selectedOrderId);
        }
    };

    const updateLineItem = (
        index: number,
        patch: Partial<SalesOrderLineItemFormState>
    ): void => {
        const nextProductId = patch.productId;
        const nextPatch =
            typeof nextProductId === "string"
                ? {
                      ...patch,
                      unitPrice: getDefaultSalesUnitPrice(
                          products,
                          nextProductId
                      ),
                  }
                : patch;
        setItems((currentItems) =>
            currentItems.map((item, itemIndex) =>
                itemIndex === index ? { ...item, ...nextPatch } : item
            )
        );
    };

    const addLineItem = (): void => {
        setItems((currentItems) => [
            ...currentItems,
            createSalesLineItem(
                products,
                products[0]?.id ?? "",
                financialSettings.defaultTaxRatePercent
            ),
        ]);
    };

    const removeLineItem = (index: number): void => {
        setItems((currentItems) =>
            currentItems.filter((_, itemIndex) => itemIndex !== index)
        );
    };

    const resetCreateForm = (): void => {
        const defaultCustomerAddress = getCustomerDefaultShippingAddress(
            customers,
            customerId
        );
        setRequiredDate("");
        patchState({
            shippingAddress: defaultCustomerAddress,
            shippingAddressSourceCustomerId: customerId || null,
        });
        setTaxAmount("0");
        setShippingCost("0");
        setItems([
            createSalesLineItem(
                products,
                products[0]?.id ?? "",
                financialSettings.defaultTaxRatePercent
            ),
        ]);
    };

    const handleCreateSalesOrder = async (): Promise<void> => {
        const normalizedItems = items
            .map((item) => ({
                productId: item.productId,
                quantity: Number(item.quantity),
                taxRate: Number(item.taxRate) || 0,
                unitPrice: Number(item.unitPrice),
            }))
            .filter(
                (item) =>
                    item.productId.length > 0 &&
                    item.quantity > 0 &&
                    item.unitPrice >= 0
            );

        if (!customerId) {
            toast.error("Select a customer.");
            return;
        }
        if (normalizedItems.length === 0) {
            toast.error("Add at least one valid order line.");
            return;
        }
        const requiredDateValue = requiredDate ? new Date(requiredDate) : null;
        const shippingAddressValue = shippingAddress.trim() || null;
        const shippingCostValue = Number(shippingCost) || 0;
        const taxAmountValue = Number(taxAmount) || 0;

        try {
            setIsCreating(true);
            await createSalesOrder({
                data: {
                    customerId,
                    items: normalizedItems.map((item) => ({
                        discountPercent: 0,
                        notes: null,
                        productId: item.productId,
                        quantity: item.quantity,
                        taxRate: item.taxRate,
                        unitPrice: item.unitPrice,
                    })),
                    notes: null,
                    requiredDate: requiredDateValue,
                    shippingAddress: shippingAddressValue,
                    shippingCost: shippingCostValue,
                    taxAmount: taxAmountValue,
                },
            });
            toast.success("Sales order created.");
            resetCreateForm();
            await refresh();
            setIsCreating(false);
        } catch (error) {
            setIsCreating(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to create sales order."
            );
        }
    };

    const handleConfirmOrder = async (orderId: string): Promise<void> => {
        try {
            setIsActionBusyId(orderId);
            await confirmSalesOrder({ data: { salesOrderId: orderId } });
            toast.success("Sales order confirmed.");
            await refresh();
            setIsActionBusyId(null);
        } catch (error) {
            setIsActionBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to confirm sales order."
            );
        }
    };

    const handleCancelOrder = async (orderId: string): Promise<void> => {
        if (cancelReason.trim().length === 0) {
            toast.error("Enter a cancellation reason.");
            return;
        }

        try {
            setIsActionBusyId(orderId);
            await cancelSalesOrder({
                data: {
                    reason: cancelReason.trim(),
                    salesOrderId: orderId,
                },
            });
            toast.success("Sales order cancelled.");
            setCancelReason("");
            await refresh();
            setIsActionBusyId(null);
        } catch (error) {
            setIsActionBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to cancel sales order."
            );
        }
    };

    const handleDeleteDraft = async (orderId: string): Promise<void> => {
        try {
            setIsActionBusyId(orderId);
            await deleteSalesOrderDraft({ data: { salesOrderId: orderId } });
            toast.success("Draft sales order deleted.");
            if (selectedOrderId === orderId) {
                setSelectedOrderId(null);
                setSelectedOrderDetail(null);
            }
            await refresh();
            setIsActionBusyId(null);
        } catch (error) {
            setIsActionBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to delete draft sales order."
            );
        }
    };

    const handleMarkDelivered = async (orderId: string): Promise<void> => {
        try {
            setIsActionBusyId(orderId);
            await markSalesOrderDelivered({ data: { salesOrderId: orderId } });
            toast.success("Order marked delivered.");
            await refresh();
            setIsActionBusyId(null);
        } catch (error) {
            setIsActionBusyId(null);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to mark order delivered."
            );
        }
    };

    const updateShipmentLine = (
        orderItemId: string,
        patch: Partial<ShipmentLineFormState>
    ): void => {
        setShipmentLines((currentLines) =>
            currentLines.map((line) =>
                line.orderItemId === orderItemId ? { ...line, ...patch } : line
            )
        );
    };

    const handleShipOrder = async (): Promise<void> => {
        if (!selectedOrderDetail) {
            return;
        }

        const payloadItems = shipmentLines
            .map((line) => ({
                quantity: Number(line.quantity) || 0,
                salesOrderItemId: line.orderItemId,
                stockItemId: line.stockItemId,
            }))
            .filter(
                (line) =>
                    line.salesOrderItemId.length > 0 &&
                    line.stockItemId.length > 0 &&
                    line.quantity > 0
            );

        if (payloadItems.length === 0) {
            toast.error("Select at least one shipment line with quantity.");
            return;
        }
        const carrierValue = shipmentCarrier.trim() || null;
        const trackingNumberValue = shipmentTrackingNumber.trim() || null;

        try {
            setIsShipping(true);
            await shipOrder({
                data: {
                    carrier: carrierValue,
                    items: payloadItems,
                    notes: null,
                    salesOrderId: selectedOrderDetail.id,
                    shippedDate: new Date(),
                    trackingNumber: trackingNumberValue,
                },
            });
            toast.success("Shipment posted.");
            setShipmentCarrier("");
            setShipmentTrackingNumber("");
            await refresh();
            setIsShipping(false);
        } catch (error) {
            setIsShipping(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to post shipment."
            );
        }
    };

    const handleSaveDraft = async (): Promise<void> => {
        if (!selectedOrderDetail || selectedOrderDetail.status !== "DRAFT") {
            return;
        }

        const normalizedLines = draftLines
            .map((line) => ({
                notes: null,
                productId: line.productId,
                quantity: Number(line.quantity),
                taxRate: Number(line.taxRate) || 0,
                unitPrice: Number(line.unitPrice),
            }))
            .filter(
                (line) =>
                    line.productId.length > 0 &&
                    line.quantity > 0 &&
                    line.unitPrice >= 0
            );

        if (normalizedLines.length === 0) {
            toast.error("Draft needs at least one valid line.");
            return;
        }
        const notesValue = draftNotes.trim() || null;
        const requiredDateValue = draftRequiredDate
            ? new Date(draftRequiredDate)
            : null;
        const shippingAddressValue = draftShippingAddress.trim() || null;
        const shippingCostValue = Number(draftShippingCost) || 0;
        const taxAmountValue = Number(draftTaxAmount) || 0;

        try {
            setIsSavingDraft(true);
            await updateSalesOrderDraft({
                data: {
                    items: normalizedLines,
                    notes: notesValue,
                    requiredDate: requiredDateValue,
                    salesOrderId: selectedOrderDetail.id,
                    shippingAddress: shippingAddressValue,
                    shippingCost: shippingCostValue,
                    taxAmount: taxAmountValue,
                },
            });
            toast.success("Draft updated.");
            await refresh();
            setIsSavingDraft(false);
        } catch (error) {
            setIsSavingDraft(false);
            toast.error(
                error instanceof Error
                    ? error.message
                    : "Failed to update draft."
            );
        }
    };

    const onCreateSalesOrderClick = () => {
        handleCreateSalesOrder().catch(() => undefined);
    };

    const onLoadOrderDetailClick = (orderId: string) => () => {
        loadOrderDetail(orderId).catch(() => undefined);
    };

    const onConfirmOrderClick = (orderId: string) => () => {
        handleConfirmOrder(orderId).catch(() => undefined);
    };

    const onCancelOrderClick = (orderId: string) => () => {
        handleCancelOrder(orderId).catch(() => undefined);
    };

    const onDeleteDraftClick = (orderId: string) => () => {
        handleDeleteDraft(orderId).catch(() => undefined);
    };

    const onMarkDeliveredClick = (orderId: string) => () => {
        handleMarkDelivered(orderId).catch(() => undefined);
    };

    const onShipOrderClick = () => {
        handleShipOrder().catch(() => undefined);
    };

    const salesOrders: SalesOrderListItem[] = salesOrdersResponse.orders;

    return {
        addLineItem,
        cancelReason,
        currencyCode: financialSettings.currencyCode,
        customerId,
        customers,
        draftLines,
        draftNotes,
        draftRequiredDate,
        draftShippingAddress,
        draftShippingCost,
        draftTaxAmount,
        handleSaveDraft,
        isActionBusyId,
        isCreating,
        isLoadingDetail,
        isLoadingOrders,
        isSavingDraft,
        isShipping,
        items,
        listFilters,
        loadSalesOrders,
        onCancelOrderClick,
        onConfirmOrderClick,
        onCreateSalesOrderClick,
        onDeleteDraftClick,
        onLoadOrderDetailClick,
        onMarkDeliveredClick,
        onShipOrderClick,
        products,
        removeLineItem,
        requiredDate,
        salesOrders,
        salesOrdersResponse,
        selectedOrderDetail,
        setCancelReason,
        setCustomerId,
        setDraftLines,
        setDraftNotes,
        setDraftRequiredDate,
        setDraftShippingAddress,
        setDraftShippingCost,
        setDraftTaxAmount,
        setListFilters,
        setRequiredDate,
        setShipmentCarrier,
        setShipmentTrackingNumber,
        setShippingAddress,
        setShippingCost,
        setTaxAmount,
        shipmentCarrier,
        shipmentLines,
        shipmentTrackingNumber,
        shippingAddress,
        shippingCost,
        subtotal,
        taxAmount,
        total,
        updateLineItem,
        updateShipmentLine,
    };
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: render function composes multiple UI workflows in one page view.
function renderSalesOrdersPage(
    controller: ReturnType<typeof useSalesOrdersPageController>
) {
    const {
        addLineItem,
        cancelReason,
        currencyCode,
        customerId,
        customers,
        draftLines,
        draftNotes,
        draftRequiredDate,
        draftShippingAddress,
        draftShippingCost,
        draftTaxAmount,
        handleSaveDraft,
        isActionBusyId,
        isCreating,
        isLoadingDetail,
        isLoadingOrders,
        isSavingDraft,
        isShipping,
        items,
        listFilters,
        loadSalesOrders,
        onCancelOrderClick,
        onConfirmOrderClick,
        onCreateSalesOrderClick,
        onDeleteDraftClick,
        onLoadOrderDetailClick,
        onMarkDeliveredClick,
        onShipOrderClick,
        products,
        removeLineItem,
        requiredDate,
        salesOrders,
        salesOrdersResponse,
        selectedOrderDetail,
        setCancelReason,
        setCustomerId,
        setDraftLines,
        setDraftNotes,
        setDraftRequiredDate,
        setDraftShippingAddress,
        setDraftShippingCost,
        setDraftTaxAmount,
        setListFilters,
        setRequiredDate,
        setShipmentCarrier,
        setShipmentTrackingNumber,
        setShippingAddress,
        setShippingCost,
        setTaxAmount,
        shipmentCarrier,
        shipmentLines,
        shipmentTrackingNumber,
        shippingAddress,
        shippingCost,
        subtotal,
        taxAmount,
        total,
        updateLineItem,
        updateShipmentLine,
    } = controller;

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">Sales Orders</h1>
                <p className="text-muted-foreground text-sm">
                    Draft, confirm, ship, and deliver customer orders.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Create Sales Order</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                        <div className="space-y-2">
                            <Label>Customer</Label>
                            <Select
                                onValueChange={(value) =>
                                    setCustomerId(value ?? "")
                                }
                                value={customerId}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select customer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {customers.map(
                                        (
                                            customer: (typeof customers)[number]
                                        ) => (
                                            <SelectItem
                                                key={customer.id}
                                                value={customer.id}
                                            >
                                                {customer.name} ({customer.code}
                                                )
                                            </SelectItem>
                                        )
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="required-date">Required Date</Label>
                            <Input
                                id="required-date"
                                onChange={(event) =>
                                    setRequiredDate(event.target.value)
                                }
                                type="date"
                                value={requiredDate}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="tax-amount">
                                Tax ({currencyCode})
                            </Label>
                            <Input
                                id="tax-amount"
                                min={0}
                                onChange={(event) =>
                                    setTaxAmount(event.target.value)
                                }
                                type="number"
                                value={taxAmount}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="shipping-cost">
                                Shipping Cost ({currencyCode})
                            </Label>
                            <Input
                                id="shipping-cost"
                                min={0}
                                onChange={(event) =>
                                    setShippingCost(event.target.value)
                                }
                                type="number"
                                value={shippingCost}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="shipping-address">
                            Shipping Address
                        </Label>
                        <Textarea
                            id="shipping-address"
                            onChange={(event) =>
                                setShippingAddress(event.target.value)
                            }
                            placeholder="Optional delivery address"
                            value={shippingAddress}
                        />
                        <p className="text-muted-foreground text-xs">
                            Auto-filled from customer profile. You can edit it
                            for this order.
                        </p>
                    </div>

                    <div className="space-y-3">
                        {items.map((item, index) => (
                            <div
                                className="grid gap-2 md:grid-cols-5"
                                key={item.id}
                            >
                                <Select
                                    onValueChange={(value) =>
                                        updateLineItem(index, {
                                            productId: value ?? "",
                                        })
                                    }
                                    value={item.productId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {products.map(
                                            (
                                                product: (typeof products)[number]
                                            ) => (
                                                <SelectItem
                                                    key={product.id}
                                                    value={product.id}
                                                >
                                                    {product.name} (
                                                    {product.sku})
                                                </SelectItem>
                                            )
                                        )}
                                    </SelectContent>
                                </Select>
                                <Input
                                    min={0}
                                    onChange={(event) =>
                                        updateLineItem(index, {
                                            quantity: event.target.value,
                                        })
                                    }
                                    placeholder="Qty"
                                    type="number"
                                    value={item.quantity}
                                />
                                <Input
                                    min={0}
                                    onChange={(event) =>
                                        updateLineItem(index, {
                                            unitPrice: event.target.value,
                                        })
                                    }
                                    placeholder={`Unit Price (${currencyCode})`}
                                    type="number"
                                    value={item.unitPrice}
                                />
                                <Input
                                    max={100}
                                    min={0}
                                    onChange={(event) =>
                                        updateLineItem(index, {
                                            taxRate: event.target.value,
                                        })
                                    }
                                    placeholder="Tax %"
                                    type="number"
                                    value={item.taxRate}
                                />
                                <Button
                                    disabled={items.length === 1}
                                    onClick={() => removeLineItem(index)}
                                    type="button"
                                    variant="outline"
                                >
                                    Remove
                                </Button>
                            </div>
                        ))}
                    </div>
                    <p className="text-muted-foreground text-xs">
                        Unit price auto-fills from product selling price and
                        stays editable for negotiated changes.
                    </p>

                    <div className="flex flex-wrap items-center gap-2">
                        <Button
                            onClick={addLineItem}
                            type="button"
                            variant="outline"
                        >
                            Add Line
                        </Button>
                        <Button
                            disabled={isCreating || !customerId}
                            onClick={onCreateSalesOrderClick}
                            type="button"
                        >
                            {isCreating ? "Saving..." : "Create Draft"}
                        </Button>
                        <span className="text-muted-foreground text-sm">
                            Subtotal:{" "}
                            {formatCurrencyFromMinorUnits(
                                subtotal,
                                currencyCode
                            )}{" "}
                            | Total:{" "}
                            {formatCurrencyFromMinorUnits(total, currencyCode)}
                        </span>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Sales Orders</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
                        <Input
                            onChange={(event) =>
                                setListFilters((current) => ({
                                    ...current,
                                    search: event.target.value,
                                }))
                            }
                            placeholder="Search order/customer"
                            value={listFilters.search}
                        />
                        <Select
                            onValueChange={(value) =>
                                setListFilters((current) => ({
                                    ...current,
                                    status: value ?? "",
                                }))
                            }
                            value={listFilters.status || null}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Statuses</SelectItem>
                                <SelectItem value="DRAFT">DRAFT</SelectItem>
                                <SelectItem value="CONFIRMED">
                                    CONFIRMED
                                </SelectItem>
                                <SelectItem value="PARTIALLY_FULFILLED">
                                    PARTIALLY_FULFILLED
                                </SelectItem>
                                <SelectItem value="FULFILLED">
                                    FULFILLED
                                </SelectItem>
                                <SelectItem value="SHIPPED">SHIPPED</SelectItem>
                                <SelectItem value="DELIVERED">
                                    DELIVERED
                                </SelectItem>
                                <SelectItem value="CANCELLED">
                                    CANCELLED
                                </SelectItem>
                            </SelectContent>
                        </Select>
                        <Select
                            onValueChange={(value) =>
                                setListFilters((current) => ({
                                    ...current,
                                    customerId: value ?? "",
                                }))
                            }
                            value={listFilters.customerId || null}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Customer" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="">All Customers</SelectItem>
                                {customers.map(
                                    (customer: (typeof customers)[number]) => (
                                        <SelectItem
                                            key={customer.id}
                                            value={customer.id}
                                        >
                                            {customer.name}
                                        </SelectItem>
                                    )
                                )}
                            </SelectContent>
                        </Select>
                        <Input
                            onChange={(event) =>
                                setListFilters((current) => ({
                                    ...current,
                                    dateFrom: event.target.value,
                                }))
                            }
                            type="date"
                            value={listFilters.dateFrom}
                        />
                        <Input
                            onChange={(event) =>
                                setListFilters((current) => ({
                                    ...current,
                                    dateTo: event.target.value,
                                }))
                            }
                            type="date"
                            value={listFilters.dateTo}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <Button
                            disabled={isLoadingOrders}
                            onClick={() => {
                                loadSalesOrders(1).catch(() => undefined);
                            }}
                            type="button"
                            variant="outline"
                        >
                            {isLoadingOrders ? (
                                <Skeleton className="h-4 w-20" />
                            ) : (
                                "Apply Filters"
                            )}
                        </Button>
                        <span className="text-muted-foreground text-sm">
                            Page {salesOrdersResponse.pagination.page} of{" "}
                            {salesOrdersResponse.pagination.totalPages} ({" "}
                            {salesOrdersResponse.pagination.total} orders)
                        </span>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="cancel-reason">
                            Cancellation Reason
                        </Label>
                        <Input
                            id="cancel-reason"
                            onChange={(event) =>
                                setCancelReason(event.target.value)
                            }
                            placeholder="Required when cancelling"
                            value={cancelReason}
                        />
                    </div>

                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Order</TableHead>
                                <TableHead>Customer</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">
                                    Total
                                </TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {salesOrders.length === 0 ? (
                                <TableRow>
                                    <TableCell
                                        className="text-muted-foreground"
                                        colSpan={5}
                                    >
                                        No sales orders found.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                salesOrders.map((order: SalesOrderListItem) => (
                                    <TableRow key={order.id}>
                                        <TableCell className="font-medium">
                                            {order.orderNumber}
                                        </TableCell>
                                        <TableCell>
                                            {order.customer.name}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {order.status}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrencyFromMinorUnits(
                                                order.totalAmount,
                                                currencyCode
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-wrap gap-2">
                                                <Button
                                                    onClick={onLoadOrderDetailClick(
                                                        order.id
                                                    )}
                                                    size="sm"
                                                    type="button"
                                                    variant="outline"
                                                >
                                                    View
                                                </Button>
                                                {order.status === "DRAFT" ? (
                                                    <Button
                                                        disabled={
                                                            isActionBusyId ===
                                                            order.id
                                                        }
                                                        onClick={onConfirmOrderClick(
                                                            order.id
                                                        )}
                                                        size="sm"
                                                        type="button"
                                                    >
                                                        Confirm
                                                    </Button>
                                                ) : null}
                                                {[
                                                    "DRAFT",
                                                    "CONFIRMED",
                                                ].includes(order.status) ? (
                                                    <Button
                                                        disabled={
                                                            isActionBusyId ===
                                                            order.id
                                                        }
                                                        onClick={onCancelOrderClick(
                                                            order.id
                                                        )}
                                                        size="sm"
                                                        type="button"
                                                        variant="destructive"
                                                    >
                                                        Cancel
                                                    </Button>
                                                ) : null}
                                                {order.status === "DRAFT" ? (
                                                    <Button
                                                        disabled={
                                                            isActionBusyId ===
                                                            order.id
                                                        }
                                                        onClick={onDeleteDraftClick(
                                                            order.id
                                                        )}
                                                        size="sm"
                                                        type="button"
                                                        variant="outline"
                                                    >
                                                        Delete Draft
                                                    </Button>
                                                ) : null}
                                                {[
                                                    "SHIPPED",
                                                    "FULFILLED",
                                                ].includes(order.status) ? (
                                                    <Button
                                                        disabled={
                                                            isActionBusyId ===
                                                            order.id
                                                        }
                                                        onClick={onMarkDeliveredClick(
                                                            order.id
                                                        )}
                                                        size="sm"
                                                        type="button"
                                                        variant="outline"
                                                    >
                                                        Mark Delivered
                                                    </Button>
                                                ) : null}
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>

                    <div className="flex items-center justify-end gap-2">
                        <Button
                            disabled={
                                isLoadingOrders ||
                                salesOrdersResponse.pagination.page <= 1
                            }
                            onClick={() => {
                                loadSalesOrders(
                                    salesOrdersResponse.pagination.page - 1
                                ).catch(() => undefined);
                            }}
                            type="button"
                            variant="outline"
                        >
                            Previous
                        </Button>
                        <Button
                            disabled={
                                isLoadingOrders ||
                                salesOrdersResponse.pagination.page >=
                                    salesOrdersResponse.pagination.totalPages
                            }
                            onClick={() => {
                                loadSalesOrders(
                                    salesOrdersResponse.pagination.page + 1
                                ).catch(() => undefined);
                            }}
                            type="button"
                            variant="outline"
                        >
                            Next
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {selectedOrderDetail ? (
                <Card>
                    <CardHeader>
                        <CardTitle>
                            Order Detail - {selectedOrderDetail.orderNumber}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {isLoadingDetail ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-40" />
                                <Skeleton className="h-4 w-72" />
                            </div>
                        ) : (
                            <>
                                <div className="text-sm">
                                    <p>
                                        Customer:{" "}
                                        {selectedOrderDetail.customer.name} (
                                        {selectedOrderDetail.customer.code})
                                    </p>
                                    <p className="text-muted-foreground">
                                        Status: {selectedOrderDetail.status}
                                    </p>
                                </div>

                                {selectedOrderDetail.status === "DRAFT" ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Edit Draft</CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
                                                <Input
                                                    onChange={(event) =>
                                                        setDraftRequiredDate(
                                                            event.target.value
                                                        )
                                                    }
                                                    type="date"
                                                    value={draftRequiredDate}
                                                />
                                                <Input
                                                    min={0}
                                                    onChange={(event) =>
                                                        setDraftTaxAmount(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder={`Tax (${currencyCode})`}
                                                    type="number"
                                                    value={draftTaxAmount}
                                                />
                                                <Input
                                                    min={0}
                                                    onChange={(event) =>
                                                        setDraftShippingCost(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder={`Shipping (${currencyCode})`}
                                                    type="number"
                                                    value={draftShippingCost}
                                                />
                                                <Input
                                                    onChange={(event) =>
                                                        setDraftShippingAddress(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Shipping Address"
                                                    value={draftShippingAddress}
                                                />
                                            </div>
                                            <Textarea
                                                onChange={(event) =>
                                                    setDraftNotes(
                                                        event.target.value
                                                    )
                                                }
                                                placeholder="Order notes"
                                                value={draftNotes}
                                            />

                                            {draftLines.map((line, index) => (
                                                <div
                                                    className="grid gap-2 md:grid-cols-4"
                                                    key={line.id}
                                                >
                                                    <Select
                                                        onValueChange={(
                                                            value
                                                        ) =>
                                                            setDraftLines(
                                                                (current) =>
                                                                    current.map(
                                                                        (
                                                                            currentLine,
                                                                            currentIndex
                                                                        ) =>
                                                                            currentIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...currentLine,
                                                                                      productId:
                                                                                          value ??
                                                                                          "",
                                                                                      unitPrice:
                                                                                          getDefaultSalesUnitPrice(
                                                                                              products,
                                                                                              value ??
                                                                                                  ""
                                                                                          ),
                                                                                  }
                                                                                : currentLine
                                                                    )
                                                            )
                                                        }
                                                        value={line.productId}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Product" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {products.map(
                                                                (
                                                                    product: (typeof products)[number]
                                                                ) => (
                                                                    <SelectItem
                                                                        key={
                                                                            product.id
                                                                        }
                                                                        value={
                                                                            product.id
                                                                        }
                                                                    >
                                                                        {
                                                                            product.name
                                                                        }
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    <Input
                                                        min={0}
                                                        onChange={(event) =>
                                                            setDraftLines(
                                                                (current) =>
                                                                    current.map(
                                                                        (
                                                                            currentLine,
                                                                            currentIndex
                                                                        ) =>
                                                                            currentIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...currentLine,
                                                                                      quantity:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : currentLine
                                                                    )
                                                            )
                                                        }
                                                        placeholder="Qty"
                                                        type="number"
                                                        value={line.quantity}
                                                    />
                                                    <Input
                                                        min={0}
                                                        onChange={(event) =>
                                                            setDraftLines(
                                                                (current) =>
                                                                    current.map(
                                                                        (
                                                                            currentLine,
                                                                            currentIndex
                                                                        ) =>
                                                                            currentIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...currentLine,
                                                                                      unitPrice:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : currentLine
                                                                    )
                                                            )
                                                        }
                                                        placeholder="Unit Price"
                                                        type="number"
                                                        value={line.unitPrice}
                                                    />
                                                    <Input
                                                        max={100}
                                                        min={0}
                                                        onChange={(event) =>
                                                            setDraftLines(
                                                                (current) =>
                                                                    current.map(
                                                                        (
                                                                            currentLine,
                                                                            currentIndex
                                                                        ) =>
                                                                            currentIndex ===
                                                                            index
                                                                                ? {
                                                                                      ...currentLine,
                                                                                      taxRate:
                                                                                          event
                                                                                              .target
                                                                                              .value,
                                                                                  }
                                                                                : currentLine
                                                                    )
                                                            )
                                                        }
                                                        placeholder="Tax %"
                                                        type="number"
                                                        value={line.taxRate}
                                                    />
                                                </div>
                                            ))}

                                            <Button
                                                disabled={isSavingDraft}
                                                onClick={() => {
                                                    handleSaveDraft().catch(
                                                        () => undefined
                                                    );
                                                }}
                                                type="button"
                                            >
                                                {isSavingDraft
                                                    ? "Saving draft..."
                                                    : "Save Draft"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : null}

                                {["CONFIRMED", "PARTIALLY_FULFILLED"].includes(
                                    selectedOrderDetail.status
                                ) ? (
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>
                                                Create Shipment
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="space-y-3">
                                            <div className="grid gap-3 md:grid-cols-2">
                                                <Input
                                                    onChange={(event) =>
                                                        setShipmentCarrier(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Carrier"
                                                    value={shipmentCarrier}
                                                />
                                                <Input
                                                    onChange={(event) =>
                                                        setShipmentTrackingNumber(
                                                            event.target.value
                                                        )
                                                    }
                                                    placeholder="Tracking Number"
                                                    value={
                                                        shipmentTrackingNumber
                                                    }
                                                />
                                            </div>

                                            {shipmentLines.map((line) => {
                                                const orderItem =
                                                    selectedOrderDetail.items.find(
                                                        (item) =>
                                                            item.id ===
                                                            line.orderItemId
                                                    );
                                                if (!orderItem) {
                                                    return null;
                                                }

                                                const bucketOptions =
                                                    selectedOrderDetail.stockBuckets.filter(
                                                        (bucket) =>
                                                            bucket.productId ===
                                                                orderItem.productId &&
                                                            bucket.availableQuantity >
                                                                0
                                                    );

                                                return (
                                                    <div
                                                        className="grid gap-2 md:grid-cols-4"
                                                        key={line.orderItemId}
                                                    >
                                                        <p className="md:col-span-2">
                                                            {
                                                                orderItem
                                                                    .product
                                                                    .name
                                                            }
                                                        </p>
                                                        <Select
                                                            onValueChange={(
                                                                value
                                                            ) =>
                                                                updateShipmentLine(
                                                                    line.orderItemId,
                                                                    {
                                                                        stockItemId:
                                                                            value ??
                                                                            "",
                                                                    }
                                                                )
                                                            }
                                                            value={
                                                                line.stockItemId
                                                            }
                                                        >
                                                            <SelectTrigger>
                                                                <SelectValue placeholder="Stock bucket" />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                {bucketOptions.map(
                                                                    (
                                                                        bucket
                                                                    ) => (
                                                                        <SelectItem
                                                                            key={
                                                                                bucket.id
                                                                            }
                                                                            value={
                                                                                bucket.id
                                                                            }
                                                                        >
                                                                            {
                                                                                bucket
                                                                                    .warehouse
                                                                                    .code
                                                                            }
                                                                            {bucket.location
                                                                                ? ` / ${bucket.location.code}`
                                                                                : ""}
                                                                            {` (Avail ${bucket.availableQuantity})`}
                                                                        </SelectItem>
                                                                    )
                                                                )}
                                                            </SelectContent>
                                                        </Select>
                                                        <Input
                                                            min={0}
                                                            onChange={(event) =>
                                                                updateShipmentLine(
                                                                    line.orderItemId,
                                                                    {
                                                                        quantity:
                                                                            event
                                                                                .target
                                                                                .value,
                                                                    }
                                                                )
                                                            }
                                                            placeholder="Qty"
                                                            type="number"
                                                            value={
                                                                line.quantity
                                                            }
                                                        />
                                                    </div>
                                                );
                                            })}

                                            <Button
                                                disabled={isShipping}
                                                onClick={onShipOrderClick}
                                                type="button"
                                            >
                                                {isShipping
                                                    ? "Posting shipment..."
                                                    : "Post Shipment"}
                                            </Button>
                                        </CardContent>
                                    </Card>
                                ) : null}
                            </>
                        )}
                    </CardContent>
                </Card>
            ) : null}
        </section>
    );
}

function SalesOrdersPage() {
    const loaderData = Route.useLoaderData();
    const controller = useSalesOrdersPageController(loaderData);
    return renderSalesOrdersPage(controller);
}
