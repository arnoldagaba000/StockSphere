import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toNumber } from "./helpers";

export const getSerialHistory = createServerFn({ method: "GET" })
    .inputValidator(z.object({ serialNumber: z.string().min(1) }))
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SERIALS_VIEW_HISTORY)) {
            throw new Error(
                "You do not have permission to view serial history."
            );
        }

        // Find the current location of this serial number
        const currentStock = await prisma.stockItem.findFirst({
            where: { serialNumber: data.serialNumber },
            include: {
                product: true,
                warehouse: true,
                location: true,
            },
        });

        // Find every StockMovement that involved this serial number.
        // This gives the complete chain of custody — every transfer, receipt, and shipment.
        const movements = await prisma.stockMovement.findMany({
            where: { serialNumber: data.serialNumber },
            orderBy: { createdAt: "asc" }, // Chronological — oldest first tells the story
            include: {
                fromWarehouse: { select: { name: true } },
                toWarehouse: { select: { name: true } },
                createdBy: { select: { name: true } },
                inventoryTransaction: {
                    select: {
                        type: true,
                        referenceType: true,
                        referenceId: true,
                    },
                },
            },
        });

        const normalizedCurrentStock = currentStock
            ? {
                  ...currentStock,
                  product: {
                      ...currentStock.product,
                      weight:
                          currentStock.product.weight === null
                              ? null
                              : toNumber(currentStock.product.weight),
                  },
                  quantity: toNumber(currentStock.quantity),
                  reservedQuantity: toNumber(currentStock.reservedQuantity),
              }
            : null;

        const normalizedMovements = movements.map((movement) => ({
            ...movement,
            quantity: toNumber(movement.quantity),
        }));

        return {
            serialNumber: data.serialNumber,
            currentLocation: normalizedCurrentStock,
            isCurrentlyInStock: normalizedCurrentStock
                ? normalizedCurrentStock.quantity > 0
                : false,
            movementHistory: normalizedMovements,
        };
    });
