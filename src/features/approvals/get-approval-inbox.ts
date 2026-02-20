import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import {
    ADJUSTMENT_APPROVAL_APPROVED_ACTION,
    ADJUSTMENT_APPROVAL_REJECTED_ACTION,
    ADJUSTMENT_APPROVAL_REQUESTED_ACTION,
    INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
    parseAdjustmentApprovalRequestPayload,
} from "@/features/inventory/adjustment-approval-request";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const APPROVER_ROLES = ["MANAGER", "ADMIN", "SUPER_ADMIN"] as const;

const canResolvePurchaseOrders = (user: {
    isActive?: boolean | null;
    role?: string | null;
}): boolean =>
    canUser(user, PERMISSIONS.PURCHASE_ORDERS_APPROVE) ||
    canUser(user, PERMISSIONS.PURCHASE_ORDERS_REJECT);

export const getApprovalInbox = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const canView =
            canUser(
                context.session.user,
                PERMISSIONS.PURCHASE_ORDERS_VIEW_LIST
            ) ||
            canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_DETAIL);
        if (!canView) {
            throw new Error("You do not have permission to view approvals.");
        }

        const [
            pendingProductChanges,
            submittedPurchaseOrders,
            adjustmentRequestLogs,
        ] = await Promise.all([
            prisma.productChangeRequest.findMany({
                where: {
                    status: "PENDING",
                },
                include: {
                    product: {
                        select: {
                            id: true,
                            name: true,
                            sku: true,
                        },
                    },
                    requestedBy: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
                orderBy: [{ createdAt: "asc" }],
                take: 200,
            }),
            prisma.purchaseOrder.findMany({
                where: {
                    deletedAt: null,
                    status: "SUBMITTED",
                },
                include: {
                    supplier: {
                        select: {
                            id: true,
                            code: true,
                            name: true,
                        },
                    },
                    createdBy: {
                        select: {
                            id: true,
                            email: true,
                            name: true,
                        },
                    },
                },
                orderBy: [{ createdAt: "asc" }],
                take: 200,
            }),
            prisma.activityLog.findMany({
                where: {
                    action: ADJUSTMENT_APPROVAL_REQUESTED_ACTION,
                    entity: INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
                },
                include: {
                    user: {
                        select: {
                            email: true,
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: [{ createdAt: "asc" }],
                take: 300,
            }),
        ]);

        const requestIds = adjustmentRequestLogs.map((entry) => entry.id);
        const resolvedRequestEntityIds = new Set(
            (requestIds.length === 0
                ? []
                : await prisma.activityLog.findMany({
                      where: {
                          action: {
                              in: [
                                  ADJUSTMENT_APPROVAL_APPROVED_ACTION,
                                  ADJUSTMENT_APPROVAL_REJECTED_ACTION,
                              ],
                          },
                          entity: INVENTORY_ADJUSTMENT_REQUEST_ENTITY,
                          entityId: { in: requestIds },
                      },
                      select: { entityId: true },
                  })
            ).map((entry) => entry.entityId)
        );

        const unresolvedAdjustmentRequests = adjustmentRequestLogs.filter(
            (entry) => !resolvedRequestEntityIds.has(entry.id)
        );

        const stockItemIds = unresolvedAdjustmentRequests
            .map(
                (entry) =>
                    parseAdjustmentApprovalRequestPayload(entry.changes)
                        ?.stockItemId
            )
            .filter(
                (stockItemId): stockItemId is string =>
                    typeof stockItemId === "string"
            );

        const stockItemMap = new Map(
            (stockItemIds.length === 0
                ? []
                : await prisma.stockItem.findMany({
                      where: { id: { in: stockItemIds } },
                      include: {
                          product: {
                              select: {
                                  id: true,
                                  name: true,
                                  sku: true,
                              },
                          },
                          warehouse: {
                              select: {
                                  id: true,
                                  code: true,
                                  name: true,
                              },
                          },
                      },
                  })
            ).map((item) => [item.id, item] as const)
        );

        const pendingAdjustmentRequests = unresolvedAdjustmentRequests
            .map((entry) => {
                const payload = parseAdjustmentApprovalRequestPayload(
                    entry.changes
                );
                if (!payload) {
                    return null;
                }

                const stockItem = stockItemMap.get(payload.stockItemId);
                if (!stockItem) {
                    return null;
                }

                return {
                    countedQuantity: payload.countedQuantity,
                    createdAt: entry.createdAt,
                    id: entry.id,
                    reason: payload.reason,
                    requestedBy: {
                        email: entry.user.email,
                        id: entry.user.id,
                        name: entry.user.name,
                    },
                    requestedDifference: payload.requestedDifference,
                    requestedPreviousQuantity:
                        payload.requestedPreviousQuantity,
                    stockItem: {
                        id: stockItem.id,
                        product: stockItem.product,
                        warehouse: stockItem.warehouse,
                    },
                };
            })
            .filter(
                (request): request is NonNullable<typeof request> =>
                    request !== null
            );

        return {
            capabilities: {
                canResolveProductChanges:
                    typeof context.session.user.role === "string" &&
                    APPROVER_ROLES.includes(
                        context.session.user
                            .role as (typeof APPROVER_ROLES)[number]
                    ),
                canResolvePurchaseOrders: canResolvePurchaseOrders(
                    context.session.user
                ),
                canResolveAdjustments:
                    canUser(
                        context.session.user,
                        PERMISSIONS.INVENTORY_ADJUST_APPROVE
                    ) ||
                    canUser(
                        context.session.user,
                        PERMISSIONS.INVENTORY_ADJUST_REJECT
                    ),
            },
            pendingAdjustmentRequests,
            pendingProductChanges,
            submittedPurchaseOrders,
        };
    });
