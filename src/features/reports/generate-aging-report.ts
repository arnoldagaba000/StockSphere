import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const generateAgingReport = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.REPORTS_AGING_DEAD_STOCK_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to view aging reports."
            );
        }

        const now = new Date();

        const stockItems = await prisma.stockItem.findMany({
            where: { quantity: { gt: 0 }, status: "AVAILABLE" },
            include: {
                product: { select: { name: true, sku: true, unit: true } },
                warehouse: { select: { name: true } },
            },
        });

        const lastMovements = await prisma.stockMovement.groupBy({
            by: ["productId"],
            where: {
                type: { in: ["SALES_SHIPMENT", "TRANSFER", "ADJUSTMENT"] },
            },
            _max: { createdAt: true },
        });

        const lastMovementMap = new Map(
            lastMovements.map((movement) => [
                movement.productId,
                movement._max.createdAt ?? null,
            ])
        );

        const rows = stockItems
            .map((item) => {
                const lastMovedAt = lastMovementMap.get(item.productId);
                const daysSinceMovement = lastMovedAt
                    ? Math.floor(
                          (now.getTime() - lastMovedAt.getTime()) /
                              (1000 * 60 * 60 * 24)
                      )
                    : null;

                let ageBracket = "365+ days (Dead Stock)";
                if (daysSinceMovement === null) {
                    ageBracket = "NEVER_MOVED";
                } else if (daysSinceMovement <= 30) {
                    ageBracket = "0-30 days";
                } else if (daysSinceMovement <= 90) {
                    ageBracket = "31-90 days";
                } else if (daysSinceMovement <= 180) {
                    ageBracket = "91-180 days";
                } else if (daysSinceMovement <= 365) {
                    ageBracket = "181-365 days";
                }

                const quantity = toNumber(item.quantity);
                const totalValueMinor = quantity * (item.unitCost ?? 0);

                return {
                    ageBracket,
                    daysSinceMovement: daysSinceMovement ?? 999_999,
                    isDeadStock:
                        daysSinceMovement === null || daysSinceMovement > 365,
                    lastMovedAt: lastMovedAt?.toISOString() ?? "Never",
                    productName: item.product.name,
                    quantity,
                    sku: item.product.sku,
                    totalValueMinor,
                    unit: item.product.unit,
                    warehouse: item.warehouse.name,
                };
            })
            .sort(
                (left, right) =>
                    right.daysSinceMovement - left.daysSinceMovement
            );

        const byBracket = rows.reduce<
            Record<string, { count: number; valueMinor: number }>
        >((acc, row) => {
            const existing = acc[row.ageBracket] ?? { count: 0, valueMinor: 0 };
            acc[row.ageBracket] = {
                count: existing.count + 1,
                valueMinor: existing.valueMinor + row.totalValueMinor,
            };
            return acc;
        }, {});

        return {
            rows,
            summary: {
                byBracket,
                totalDeadStockValueMinor: rows
                    .filter((row) => row.isDeadStock)
                    .reduce((sum, row) => sum + row.totalValueMinor, 0),
            },
        };
    });
