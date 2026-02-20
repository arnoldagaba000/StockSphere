import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import {
    assertPositiveQuantity,
    getStockItemOrThrow,
    toNumber,
} from "@/features/inventory/helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { disassembleKitSchema } from "@/schemas/kit-schema";

const buildDisassemblyNumber = (stockItemId: string): string =>
    `DSM-${Date.now()}-${stockItemId.slice(0, 6)}`;

export const disassembleKit = createServerFn({ method: "POST" })
    .inputValidator(disassembleKitSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.KITS_DISASSEMBLY_PERFORM)
        ) {
            throw new Error("You do not have permission to disassemble kits.");
        }

        assertPositiveQuantity(data.quantity, "Disassembly quantity");

        const kitStockItem = await getStockItemOrThrow(data.kitStockItemId);
        const availableQuantity =
            toNumber(kitStockItem.quantity) -
            toNumber(kitStockItem.reservedQuantity);
        if (availableQuantity < data.quantity) {
            throw new Error(
                "Disassembly quantity exceeds available kit stock."
            );
        }

        const kit = await prisma.product.findFirst({
            where: { deletedAt: null, id: kitStockItem.productId },
            include: {
                kitComponents: {
                    include: {
                        component: {
                            select: {
                                id: true,
                                isActive: true,
                                name: true,
                                sku: true,
                            },
                        },
                    },
                },
            },
        });
        if (!kit?.isKit) {
            throw new Error("Selected stock item is not a valid kit.");
        }
        if (kit.kitComponents.length === 0) {
            throw new Error("Kit has no BOM components configured.");
        }

        const movementNumber = buildDisassemblyNumber(kitStockItem.id);
        const result = await prisma.$transaction(async (tx) => {
            const transaction = await tx.inventoryTransaction.create({
                data: {
                    createdById: context.session.user.id,
                    notes: data.notes ?? "Kit disassembly",
                    referenceType: "KitDisassembly",
                    transactionNumber: movementNumber,
                    type: "DISASSEMBLY",
                },
            });

            const updatedKitStockItem = await tx.stockItem.update({
                where: { id: kitStockItem.id },
                data: {
                    quantity: toNumber(kitStockItem.quantity) - data.quantity,
                },
            });

            await tx.stockMovement.create({
                data: {
                    batchNumber: kitStockItem.batchNumber,
                    createdById: context.session.user.id,
                    fromWarehouseId: kitStockItem.warehouseId,
                    inventoryTransactionId: transaction.id,
                    movementNumber: `${movementNumber}-KIT`,
                    productId: kitStockItem.productId,
                    quantity: data.quantity,
                    reason: data.notes ?? "Kit disassembly input",
                    referenceNumber: movementNumber,
                    serialNumber: kitStockItem.serialNumber,
                    type: "DISASSEMBLY",
                },
            });

            const returnedComponents: Array<{
                componentId: string;
                componentName: string;
                quantity: number;
                stockItemId: string;
            }> = [];

            for (const component of kit.kitComponents) {
                const returnQuantity =
                    toNumber(component.quantity) * data.quantity;
                const existingComponentStock = await tx.stockItem.findFirst({
                    where: {
                        batchNumber: null,
                        locationId: kitStockItem.locationId,
                        productId: component.componentId,
                        serialNumber: null,
                        status: "AVAILABLE",
                        warehouseId: kitStockItem.warehouseId,
                    },
                });

                const updatedComponentStock = existingComponentStock
                    ? await tx.stockItem.update({
                          where: { id: existingComponentStock.id },
                          data: {
                              quantity:
                                  toNumber(existingComponentStock.quantity) +
                                  returnQuantity,
                          },
                      })
                    : await tx.stockItem.create({
                          data: {
                              batchNumber: null,
                              expiryDate: null,
                              locationId: kitStockItem.locationId,
                              productId: component.componentId,
                              quantity: returnQuantity,
                              reservedQuantity: 0,
                              serialNumber: null,
                              status: "AVAILABLE",
                              unitCost: null,
                              warehouseId: kitStockItem.warehouseId,
                          },
                      });

                await tx.stockMovement.create({
                    data: {
                        createdById: context.session.user.id,
                        inventoryTransactionId: transaction.id,
                        movementNumber: `${movementNumber}-${component.componentId.slice(0, 4)}`,
                        productId: component.componentId,
                        quantity: returnQuantity,
                        reason:
                            data.notes ?? "Kit disassembly component return",
                        referenceNumber: movementNumber,
                        toWarehouseId: kitStockItem.warehouseId,
                        type: "DISASSEMBLY",
                    },
                });

                returnedComponents.push({
                    componentId: component.componentId,
                    componentName: component.component.name,
                    quantity: returnQuantity,
                    stockItemId: updatedComponentStock.id,
                });
            }

            return {
                returnedComponents,
                transactionNumber: transaction.transactionNumber,
                updatedKitStockItem,
            };
        });

        return {
            disassembledQuantity: data.quantity,
            returnedComponents: result.returnedComponents,
            transactionNumber: result.transactionNumber,
            updatedKitStockItem: {
                ...result.updatedKitStockItem,
                quantity: toNumber(result.updatedKitStockItem.quantity),
                reservedQuantity: toNumber(
                    result.updatedKitStockItem.reservedQuantity
                ),
            },
        };
    });
