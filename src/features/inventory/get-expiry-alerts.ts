import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

export const getExpiryAlerts = createServerFn({ method: "GET" })
    .inputValidator(
        z.object({
            daysAhead: z.preprocess(
                (value) => Number(value ?? 90),
                z.number().int().min(1).max(365)
            ),
            warehouseId: z.string().min(1).optional(),
        })
    )
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.INVENTORY_REPORT_EXPIRY_VIEW
            )
        ) {
            throw new Error(
                "You do not have permission to view expiry alerts."
            );
        }

        const daysAhead = data.daysAhead;
        const now = new Date();

        const futureDate = new Date();
        futureDate.setDate(now.getDate() + daysAhead);

        const stockItems = await prisma.stockItem.findMany({
            where: {
                status: "AVAILABLE",
                expiryDate: {
                    not: null,
                    lte: futureDate, // Expiring within the window
                },
                quantity: { gt: 0 },
                ...(data.warehouseId && { warehouseId: data.warehouseId }),
            },
            include: {
                product: { select: { name: true, sku: true, unit: true } },
                warehouse: { select: { name: true } },
                location: { select: { code: true, name: true } },
            },
            orderBy: { expiryDate: "asc" }, // Most urgent first
        });

        // Enrich with urgency classification so the UI can colour-code appropriately.
        // This calculation happens in application code rather than SQL because
        // the thresholds are business logic, not database logic.
        return stockItems
            .map((item) => {
                if (!item.expiryDate) {
                    return null;
                }
                const daysUntilExpiry = Math.floor(
                    (item.expiryDate.getTime() - now.getTime()) /
                        (1000 * 60 * 60 * 24)
                );
                const quantity = toNumber(item.quantity);
                const reservedQuantity = toNumber(item.reservedQuantity);
                let urgency: "CRITICAL" | "EXPIRED" | "NOTICE" | "WARNING" =
                    "NOTICE";
                if (daysUntilExpiry <= 0) {
                    urgency = "EXPIRED";
                } else if (daysUntilExpiry <= 14) {
                    urgency = "CRITICAL";
                } else if (daysUntilExpiry <= 30) {
                    urgency = "WARNING";
                }

                return {
                    batchNumber: item.batchNumber,
                    daysUntilExpiry,
                    expiryDate: item.expiryDate,
                    id: item.id,
                    location: item.location,
                    product: item.product,
                    quantity,
                    reservedQuantity,
                    serialNumber: item.serialNumber,
                    status: item.status,
                    unitCost: item.unitCost,
                    warehouse: item.warehouse,
                    urgency,
                    availableQuantity: quantity - reservedQuantity,
                };
            })
            .filter((item) => item !== null);
    });
