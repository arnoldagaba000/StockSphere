import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getPurchasingReportInputSchema = z.object({
    days: z.number().int().min(1).max(365).optional().default(30),
});

export const getPurchasingReport = createServerFn({ method: "GET" })
    .inputValidator(getPurchasingReportInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.REPORTS_PURCHASE_ANALYTICS_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to view purchasing analytics."
            );
        }

        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - data.days);

        const [ordersByStatus, recentOrders, topSuppliers] = await Promise.all([
            prisma.purchaseOrder.groupBy({
                _count: { _all: true },
                by: ["status"],
                where: { deletedAt: null },
            }),
            prisma.purchaseOrder.findMany({
                select: {
                    id: true,
                    orderDate: true,
                    status: true,
                    totalAmount: true,
                },
                where: {
                    deletedAt: null,
                    orderDate: { gte: fromDate },
                    status: {
                        in: ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED"],
                    },
                },
            }),
            prisma.supplier.findMany({
                include: {
                    purchaseOrders: {
                        select: { id: true, status: true, totalAmount: true },
                        where: {
                            deletedAt: null,
                            orderDate: { gte: fromDate },
                        },
                    },
                },
                orderBy: [{ name: "asc" }],
                where: { deletedAt: null },
            }),
        ]);

        const recentSpend = recentOrders.reduce(
            (sum, order) => sum + order.totalAmount,
            0
        );

        const supplierPerformance = topSuppliers
            .map((supplier) => {
                const totalSpend = supplier.purchaseOrders.reduce(
                    (sum, order) =>
                        order.status === "CANCELLED"
                            ? sum
                            : sum + order.totalAmount,
                    0
                );
                const receivedOrders = supplier.purchaseOrders.filter(
                    (order) =>
                        order.status === "PARTIALLY_RECEIVED" ||
                        order.status === "RECEIVED"
                ).length;

                return {
                    id: supplier.id,
                    name: supplier.name,
                    openOrders: supplier.purchaseOrders.filter(
                        (order) =>
                            order.status === "DRAFT" ||
                            order.status === "SUBMITTED" ||
                            order.status === "APPROVED"
                    ).length,
                    orderCount: supplier.purchaseOrders.length,
                    receivedOrders,
                    totalSpend,
                };
            })
            .sort((a, b) => b.totalSpend - a.totalSpend)
            .slice(0, 10);

        return {
            days: data.days,
            recentOrderCount: recentOrders.length,
            recentSpend,
            statusBreakdown: ordersByStatus.map((entry) => ({
                count: entry._count._all,
                status: entry.status,
            })),
            supplierPerformance,
        };
    });
