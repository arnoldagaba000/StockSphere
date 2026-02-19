import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

const putawaySuggestionsSchema = z.object({
    productId: z.string().min(1),
    quantity: z.preprocess((value) => Number(value), z.number().positive()),
    warehouseId: z.string().min(1),
});

export const getPutawaySuggestions = createServerFn({ method: "GET" })
    .inputValidator(putawaySuggestionsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !(
                canUser(context.session.user, PERMISSIONS.LOCATIONS_VIEW) &&
                canUser(
                    context.session.user,
                    PERMISSIONS.INVENTORY_STOCK_BY_LOCATION
                )
            )
        ) {
            throw new Error(
                "You do not have permission to view putaway suggestions."
            );
        }

        const [locations, locationLoads] = await Promise.all([
            prisma.location.findMany({
                where: {
                    deletedAt: null,
                    isActive: true,
                    type: "STANDARD",
                    warehouseId: data.warehouseId,
                },
                orderBy: { code: "asc" },
            }),
            prisma.stockItem.groupBy({
                by: ["locationId"],
                where: {
                    locationId: { not: null },
                    warehouseId: data.warehouseId,
                },
                _sum: { quantity: true },
                _count: { _all: true },
            }),
        ]);

        const loadByLocation = new Map(
            locationLoads.map((entry) => [
                entry.locationId,
                {
                    bucketCount: entry._count._all,
                    totalQuantity: toNumber(entry._sum.quantity ?? 0),
                },
            ])
        );

        return locations
            .map((location) => {
                const load = loadByLocation.get(location.id) ?? {
                    bucketCount: 0,
                    totalQuantity: 0,
                };

                return {
                    location,
                    recommendedQuantity: data.quantity,
                    score: load.totalQuantity + load.bucketCount * 10,
                };
            })
            .sort((a, b) => a.score - b.score)
            .slice(0, 5);
    });
