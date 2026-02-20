import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { toNumber } from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getKitsInputValidator = (input: { warehouseId?: string }) => input;

export const getKits = createServerFn({ method: "GET" })
    .inputValidator(getKitsInputValidator)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.KITS_VIEW_LIST)) {
            throw new Error("You do not have permission to view kits.");
        }

        const kits = await prisma.product.findMany({
            where: { deletedAt: null, isKit: true, isActive: true },
            include: {
                kitComponents: {
                    include: {
                        component: {
                            select: {
                                id: true,
                                isActive: true,
                                name: true,
                                sku: true,
                                unit: true,
                            },
                        },
                    },
                    orderBy: { createdAt: "asc" },
                },
                stockItems: data.warehouseId
                    ? {
                          where: {
                              status: "AVAILABLE",
                              warehouseId: data.warehouseId,
                          },
                      }
                    : {
                          where: { status: "AVAILABLE" },
                      },
            },
            orderBy: { name: "asc" },
        });

        const componentIds = Array.from(
            new Set(
                kits.flatMap((kit) =>
                    kit.kitComponents.map((item) => item.componentId)
                )
            )
        );

        const componentStockRows =
            componentIds.length > 0
                ? await prisma.stockItem.findMany({
                      where: {
                          productId: { in: componentIds },
                          status: "AVAILABLE",
                          ...(data.warehouseId
                              ? { warehouseId: data.warehouseId }
                              : {}),
                      },
                      select: {
                          productId: true,
                          quantity: true,
                          reservedQuantity: true,
                      },
                  })
                : [];

        const componentAvailability = new Map<string, number>();
        for (const row of componentStockRows) {
            const available =
                toNumber(row.quantity) - toNumber(row.reservedQuantity);
            componentAvailability.set(
                row.productId,
                (componentAvailability.get(row.productId) ?? 0) + available
            );
        }

        return kits.map((kit) => {
            const totalKitQuantity = kit.stockItems.reduce(
                (sum, item) => sum + toNumber(item.quantity),
                0
            );
            const bom = kit.kitComponents.map((entry) => {
                const requiredPerKit = toNumber(entry.quantity);
                const availableComponentQty =
                    componentAvailability.get(entry.componentId) ?? 0;
                const possibleKitUnits =
                    requiredPerKit > 0
                        ? Math.floor(availableComponentQty / requiredPerKit)
                        : 0;

                return {
                    availableComponentQty,
                    componentId: entry.componentId,
                    componentName: entry.component.name,
                    componentSku: entry.component.sku,
                    componentUnit: entry.component.unit,
                    possibleKitUnits,
                    quantityPerKit: requiredPerKit,
                };
            });

            const assemblableUnits =
                bom.length > 0
                    ? Math.min(...bom.map((entry) => entry.possibleKitUnits))
                    : 0;

            return {
                assemblableUnits,
                bom,
                kitId: kit.id,
                kitName: kit.name,
                kitSku: kit.sku,
                onHandQuantity: totalKitQuantity,
            };
        });
    });
