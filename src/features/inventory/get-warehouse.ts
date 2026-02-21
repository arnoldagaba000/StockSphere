import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getWarehouseSchema = z.object({
    id: z.string().min(1),
});

export const getWarehouse = createServerFn({ method: "GET" })
    .inputValidator(getWarehouseSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.WAREHOUSES_VIEW_DETAIL)
        ) {
            throw new Error(
                "You do not have permission to view warehouse details."
            );
        }

        const warehouse = await prisma.warehouse.findFirst({
            where: {
                id: data.id,
            },
            include: {
                _count: {
                    select: {
                        goodsReceiptItems: true,
                        inventoryAdjustments: true,
                        locations: true,
                        stockItems: true,
                    },
                },
                locations: {
                    orderBy: [{ code: "asc" }],
                    select: {
                        id: true,
                        code: true,
                        isActive: true,
                        name: true,
                        type: true,
                    },
                    take: 20,
                    where: { deletedAt: null },
                },
            },
        });

        if (!warehouse) {
            throw new Error("Warehouse not found.");
        }

        return warehouse;
    });
