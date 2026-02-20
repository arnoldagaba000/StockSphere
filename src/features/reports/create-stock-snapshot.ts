import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const createStockSnapshot = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.REPORTS_DASHBOARD_KPI_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to create stock snapshots."
            );
        }

        const snapshotDate = new Date();

        const stockItems = await prisma.stockItem.findMany({
            where: { status: "AVAILABLE" },
            select: {
                productId: true,
                quantity: true,
                unitCost: true,
                warehouseId: true,
            },
        });

        const aggregated = new Map<
            string,
            { quantity: number; value: number }
        >();

        for (const item of stockItems) {
            const key = `${item.productId}::${item.warehouseId}`;
            const existing = aggregated.get(key) ?? { quantity: 0, value: 0 };
            const quantity = toNumber(item.quantity);
            const value = quantity * (item.unitCost ?? 0);
            aggregated.set(key, {
                quantity: existing.quantity + quantity,
                value: existing.value + value,
            });
        }

        await prisma.$transaction(async (tx) => {
            for (const [key, data] of aggregated.entries()) {
                const [productId, warehouseId] = key.split("::");
                await tx.stockSnapshot.create({
                    data: {
                        date: snapshotDate,
                        productId,
                        quantity: data.quantity,
                        value: data.value,
                        warehouseId,
                    },
                });
            }
        });

        return {
            recordsCreated: aggregated.size,
            snapshotDate,
        };
    });
