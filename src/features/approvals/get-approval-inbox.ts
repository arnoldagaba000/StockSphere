import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const APPROVER_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

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
            canUser(context.session.user, PERMISSIONS.PURCHASE_ORDERS_VIEW_LIST) ||
            canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_DETAIL);
        if (!canView) {
            throw new Error("You do not have permission to view approvals.");
        }

        const [pendingProductChanges, submittedPurchaseOrders] = await Promise.all([
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
        ]);

        return {
            capabilities: {
                canResolveProductChanges:
                    typeof context.session.user.role === "string" &&
                    APPROVER_ROLES.includes(
                        context.session.user.role as (typeof APPROVER_ROLES)[number]
                    ),
                canResolvePurchaseOrders: canResolvePurchaseOrders(
                    context.session.user
                ),
            },
            pendingProductChanges,
            submittedPurchaseOrders,
        };
    });

