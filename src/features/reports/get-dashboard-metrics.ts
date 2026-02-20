import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const getDashboardMetrics = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.REPORTS_DASHBOARD_KPI_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to view dashboard metrics."
            );
        }

        const [
            stockItems,
            pendingPurchaseOrders,
            pendingSalesOrders,
            recentMovements,
        ] = await Promise.all([
            prisma.stockItem.findMany({
                where: { status: "AVAILABLE" },
                include: {
                    product: { select: { reorderPoint: true } },
                },
            }),
            prisma.purchaseOrder.count({
                where: { status: { in: ["SUBMITTED"] } },
            }),
            prisma.salesOrder.count({
                where: { status: { in: ["CONFIRMED", "PARTIALLY_FULFILLED"] } },
            }),
            prisma.stockMovement.count({
                where: {
                    createdAt: {
                        gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                    },
                },
            }),
        ]);

        let totalUnitsInStock = 0;
        let lowStockAlerts = 0;
        let totalStockValueMinor = 0;

        for (const item of stockItems) {
            const quantity = toNumber(item.quantity);
            const reservedQuantity = toNumber(item.reservedQuantity);
            totalUnitsInStock += quantity;
            totalStockValueMinor += quantity * (item.unitCost ?? 0);

            const reorderPoint = item.product.reorderPoint ?? 0;
            if (
                reorderPoint > 0 &&
                quantity - reservedQuantity <= reorderPoint
            ) {
                lowStockAlerts += 1;
            }
        }

        const expiryCutoff = new Date();
        expiryCutoff.setDate(expiryCutoff.getDate() + 30);

        const expiringIn30Days = stockItems.filter((item) => {
            const quantity = toNumber(item.quantity);
            return (
                item.expiryDate !== null &&
                item.expiryDate >= new Date() &&
                item.expiryDate <= expiryCutoff &&
                quantity > 0
            );
        }).length;

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const snapshots = await prisma.stockSnapshot.groupBy({
            by: ["date"],
            where: { date: { gte: thirtyDaysAgo } },
            _sum: { quantity: true, value: true },
            orderBy: { date: "asc" },
        });

        return {
            expiringIn30Days,
            inventoryTrend: snapshots.map((snapshot) => ({
                date: snapshot.date,
                totalQuantity: toNumber(snapshot._sum.quantity ?? 0),
                totalValueMinor: snapshot._sum.value ?? 0,
            })),
            lowStockAlerts,
            pendingPurchaseOrders,
            pendingSalesOrders,
            recentMovementsLast7Days: recentMovements,
            totalStockValueMinor,
            totalUnitsInStock,
        };
    });
