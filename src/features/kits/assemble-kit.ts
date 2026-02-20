import { createServerFn } from "@tanstack/react-start";
import type { z } from "zod";
import { prisma } from "@/db";
import { assertPositiveQuantity, toNumber } from "@/features/inventory/helpers";
import type { Prisma } from "@/generated/prisma/client";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { assembleKitSchema } from "@/schemas/kit-schema";

type TransactionClient = Prisma.TransactionClient;
type KitWithComponents = Prisma.ProductGetPayload<{
    include: {
        kitComponents: {
            include: {
                component: {
                    select: {
                        id: true;
                        isActive: true;
                        name: true;
                        sku: true;
                    };
                };
            };
        };
    };
}>;

type AssemblyInput = z.infer<typeof assembleKitSchema>;

interface ComponentRequirement {
    componentId: string;
    componentName: string;
    requiredQuantity: number;
}

const buildAssemblyNumber = (kitId: string): string =>
    `ASM-${Date.now()}-${kitId.slice(0, 6)}`;

const sortForConsumption = <
    T extends { createdAt: Date; expiryDate: Date | null },
>(
    rows: T[]
): T[] =>
    [...rows].sort((left, right) => {
        const leftExpiry =
            left.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
        const rightExpiry =
            right.expiryDate?.getTime() ?? Number.POSITIVE_INFINITY;
        if (leftExpiry !== rightExpiry) {
            return leftExpiry - rightExpiry;
        }
        return left.createdAt.getTime() - right.createdAt.getTime();
    });

const loadAssemblyContext = async (data: AssemblyInput) => {
    const [kit, warehouse, location] = await Promise.all([
        prisma.product.findFirst({
            where: { deletedAt: null, id: data.kitId },
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
        }),
        prisma.warehouse.findFirst({
            where: { deletedAt: null, id: data.warehouseId },
            select: { id: true },
        }),
        data.kitLocationId
            ? prisma.location.findFirst({
                  where: {
                      deletedAt: null,
                      id: data.kitLocationId,
                      warehouseId: data.warehouseId,
                  },
                  select: { id: true },
              })
            : Promise.resolve(null),
    ]);

    return { kit, location, warehouse };
};

const assertAssemblyContext = (
    kit: KitWithComponents | null,
    warehouseFound: boolean,
    locationFound: boolean,
    data: AssemblyInput
): KitWithComponents => {
    if (!warehouseFound) {
        throw new Error("Warehouse not found.");
    }
    if (data.kitLocationId && !locationFound) {
        throw new Error("Kit location not found in selected warehouse.");
    }
    if (!kit?.isKit) {
        throw new Error("Kit product not found.");
    }
    if (!kit.isActive) {
        throw new Error("Kit product is inactive.");
    }
    if (kit.kitComponents.length === 0) {
        throw new Error("Kit has no BOM components configured.");
    }
    if (kit.trackBySerialNumber && data.quantity !== 1) {
        throw new Error(
            "Serial-tracked kits can only be assembled one unit at a time."
        );
    }
    if (kit.trackBySerialNumber && !data.kitSerialNumber) {
        throw new Error("Serial number is required for serial-tracked kits.");
    }
    if (kit.trackByBatch && !data.kitBatchNumber) {
        throw new Error("Batch number is required for batch-tracked kits.");
    }
    if (kit.trackByExpiry && !data.kitExpiryDate) {
        throw new Error("Expiry date is required for expiry-tracked kits.");
    }
    return kit;
};

const getComponentRequirements = (
    kit: KitWithComponents,
    quantity: number
): ComponentRequirement[] =>
    kit.kitComponents.map((component) => ({
        componentId: component.componentId,
        componentName: component.component.name,
        requiredQuantity: toNumber(component.quantity) * quantity,
    }));

const assertAvailableComponentQuantities = async (
    requirements: ComponentRequirement[],
    warehouseId: string
) => {
    const stockRows = await prisma.stockItem.findMany({
        where: {
            productId: { in: requirements.map((item) => item.componentId) },
            status: "AVAILABLE",
            warehouseId,
        },
        select: {
            productId: true,
            quantity: true,
            reservedQuantity: true,
        },
    });

    const availableByComponent = new Map<string, number>();
    for (const row of stockRows) {
        const available =
            toNumber(row.quantity) - toNumber(row.reservedQuantity);
        availableByComponent.set(
            row.productId,
            (availableByComponent.get(row.productId) ?? 0) + available
        );
    }

    for (const requirement of requirements) {
        const available =
            availableByComponent.get(requirement.componentId) ?? 0;
        if (available < requirement.requiredQuantity) {
            throw new Error(
                `Insufficient stock for component ${requirement.componentName}. Required ${requirement.requiredQuantity}, available ${available}.`
            );
        }
    }
};

const assertUniqueSerialIfNeeded = async (
    kit: KitWithComponents,
    serialNumber: string | undefined
) => {
    if (!(kit.trackBySerialNumber && serialNumber)) {
        return;
    }
    const existingSerial = await prisma.stockItem.findFirst({
        where: { productId: kit.id, serialNumber },
        select: { id: true },
    });
    if (existingSerial) {
        throw new Error("Kit serial number already exists.");
    }
};

const consumeComponentRequirement = async (
    tx: TransactionClient,
    requirement: ComponentRequirement,
    data: AssemblyInput,
    inventoryTransactionId: string,
    movementNumber: string,
    actorUserId: string
): Promise<number> => {
    let remaining = requirement.requiredQuantity;
    let consumedCostMinor = 0;

    const rows = await tx.stockItem.findMany({
        where: {
            productId: requirement.componentId,
            status: "AVAILABLE",
            warehouseId: data.warehouseId,
        },
        orderBy: [{ expiryDate: "asc" }, { createdAt: "asc" }],
    });

    for (const row of sortForConsumption(rows)) {
        if (remaining <= 0) {
            break;
        }

        const available =
            toNumber(row.quantity) - toNumber(row.reservedQuantity);
        if (available <= 0) {
            continue;
        }

        const consumeQty = Math.min(remaining, available);
        await tx.stockItem.update({
            where: { id: row.id },
            data: { quantity: toNumber(row.quantity) - consumeQty },
        });
        await tx.stockMovement.create({
            data: {
                batchNumber: row.batchNumber,
                createdById: actorUserId,
                fromWarehouseId: data.warehouseId,
                inventoryTransactionId,
                movementNumber: `${movementNumber}-${row.id.slice(0, 4)}`,
                productId: row.productId,
                quantity: consumeQty,
                reason: data.notes ?? "Kit assembly component consumption",
                referenceNumber: movementNumber,
                serialNumber: row.serialNumber,
                type: "ASSEMBLY",
            },
        });

        consumedCostMinor += consumeQty * (row.unitCost ?? 0);
        remaining -= consumeQty;
    }

    if (remaining > 0) {
        throw new Error(
            `Failed to consume required quantity for component ${requirement.componentName}.`
        );
    }

    return consumedCostMinor;
};

const upsertAssembledKitStock = async (
    tx: TransactionClient,
    kit: KitWithComponents,
    data: AssemblyInput,
    assembledUnitCost: number
) => {
    const existingKitStock = await tx.stockItem.findFirst({
        where: {
            batchNumber: data.kitBatchNumber ?? null,
            locationId: data.kitLocationId ?? null,
            productId: kit.id,
            serialNumber: data.kitSerialNumber ?? null,
            status: "AVAILABLE",
            warehouseId: data.warehouseId,
        },
    });

    if (!existingKitStock) {
        return await tx.stockItem.create({
            data: {
                batchNumber: data.kitBatchNumber ?? null,
                expiryDate: data.kitExpiryDate ?? null,
                locationId: data.kitLocationId ?? null,
                productId: kit.id,
                quantity: data.quantity,
                reservedQuantity: 0,
                serialNumber: data.kitSerialNumber ?? null,
                status: "AVAILABLE",
                unitCost: assembledUnitCost,
                warehouseId: data.warehouseId,
            },
        });
    }

    const previousQuantity = toNumber(existingKitStock.quantity);
    const nextQuantity = previousQuantity + data.quantity;
    const existingCost = existingKitStock.unitCost ?? assembledUnitCost;
    const nextUnitCost = Math.round(
        (previousQuantity * existingCost + data.quantity * assembledUnitCost) /
            nextQuantity
    );

    return await tx.stockItem.update({
        where: { id: existingKitStock.id },
        data: {
            expiryDate: data.kitExpiryDate ?? existingKitStock.expiryDate,
            quantity: nextQuantity,
            unitCost: nextUnitCost,
        },
    });
};

const executeAssemblyTransaction = async (
    actorUserId: string,
    data: AssemblyInput,
    kit: KitWithComponents,
    requirements: ComponentRequirement[]
) => {
    const movementNumber = buildAssemblyNumber(kit.id);
    return await prisma.$transaction(async (tx) => {
        const transaction = await tx.inventoryTransaction.create({
            data: {
                createdById: actorUserId,
                notes: data.notes ?? "Kit assembly",
                referenceType: "KitAssembly",
                transactionNumber: movementNumber,
                type: "ASSEMBLY",
            },
        });

        let totalConsumedCostMinor = 0;
        for (const requirement of requirements) {
            totalConsumedCostMinor += await consumeComponentRequirement(
                tx,
                requirement,
                data,
                transaction.id,
                movementNumber,
                actorUserId
            );
        }

        const assembledUnitCost = Math.round(
            totalConsumedCostMinor / data.quantity
        );
        const kitStockItem = await upsertAssembledKitStock(
            tx,
            kit,
            data,
            assembledUnitCost
        );

        await tx.stockMovement.create({
            data: {
                batchNumber: data.kitBatchNumber ?? null,
                createdById: actorUserId,
                inventoryTransactionId: transaction.id,
                movementNumber: `${movementNumber}-KIT`,
                productId: kit.id,
                quantity: data.quantity,
                reason: data.notes ?? "Kit assembly output",
                referenceNumber: movementNumber,
                serialNumber: data.kitSerialNumber ?? null,
                toWarehouseId: data.warehouseId,
                type: "ASSEMBLY",
            },
        });

        return {
            assembledUnitCost,
            kitStockItem,
            transactionNumber: transaction.transactionNumber,
        };
    });
};

export const assembleKit = createServerFn({ method: "POST" })
    .inputValidator(assembleKitSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.KITS_ASSEMBLY_PERFORM)) {
            throw new Error("You do not have permission to assemble kits.");
        }
        assertPositiveQuantity(data.quantity, "Assembly quantity");

        const ctx = await loadAssemblyContext(data);
        const kit = assertAssemblyContext(
            ctx.kit,
            Boolean(ctx.warehouse),
            Boolean(ctx.location),
            data
        );
        const requirements = getComponentRequirements(kit, data.quantity);

        await assertAvailableComponentQuantities(
            requirements,
            data.warehouseId
        );
        await assertUniqueSerialIfNeeded(kit, data.kitSerialNumber);

        const result = await executeAssemblyTransaction(
            context.session.user.id,
            data,
            kit,
            requirements
        );

        return {
            assembledQuantity: data.quantity,
            assembledUnitCost: result.assembledUnitCost,
            kitStockItem: {
                ...result.kitStockItem,
                quantity: toNumber(result.kitStockItem.quantity),
                reservedQuantity: toNumber(
                    result.kitStockItem.reservedQuantity
                ),
            },
            transactionNumber: result.transactionNumber,
        };
    });
