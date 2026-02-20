import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getKitStockItemsSchema = z.object({
    kitId: z.string().min(1),
    warehouseId: z.string().min(1),
});

export const getKitStockItems = createServerFn({ method: "GET" })
    .inputValidator(getKitStockItemsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.KITS_VIEW_ASSEMBLY_AVAILABILITY
            )
        ) {
            throw new Error("You do not have permission to view kit stock.");
        }

        const stockItems = await prisma.stockItem.findMany({
            where: {
                productId: data.kitId,
                status: "AVAILABLE",
                warehouseId: data.warehouseId,
            },
            include: {
                location: {
                    select: { code: true, name: true },
                },
            },
            orderBy: [{ createdAt: "desc" }],
        });

        return stockItems.map((item) => ({
            availableQuantity:
                toNumber(item.quantity) - toNumber(item.reservedQuantity),
            batchNumber: item.batchNumber,
            locationCode: item.location?.code,
            locationName: item.location?.name,
            quantity: toNumber(item.quantity),
            reservedQuantity: toNumber(item.reservedQuantity),
            serialNumber: item.serialNumber,
            stockItemId: item.id,
        }));
    });
