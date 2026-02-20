import type { PrismaClient } from "@/generated/prisma/client";

type Tx = Parameters<Parameters<PrismaClient["$transaction"]>[0]>[0];

interface PickingAllocation {
    stockItemId: string;
    warehouseId: string;
    locationId: string | null;
    batchNumber: string | null;
    serialNumber: string | null;
    expiryDate: Date | null;
    quantityToTake: number;
}

interface FEFOPickerOptions {
    productId: string;
    warehouseId: string;
    quantityNeeded: number;
    // Exclude stock with expiry dates on or before this date.
    // Defaults to today — you never want to suggest already-expired stock.
    excludeExpiredBefore?: Date;
}

/**
 * Calculates the optimal stock allocation for a given picking need.
 *
 * The algorithm works in two passes:
 * Pass 1: Expiry-tracked stock, ordered earliest-expiry-first (FEFO).
 *         This ensures perishable batches are consumed before they expire.
 * Pass 2: Non-expiry-tracked stock, ordered oldest-received-first (FIFO).
 *         This handles products that have some batches with expiry and some without.
 *
 * Returns an array of allocations — one per stock bucket — with the quantity
 * to take from each. The caller is responsible for actually updating the database.
 * This function is pure: it reads but does not write.
 */
export async function calculateFEFOAllocations(
    tx: Tx,
    options: FEFOPickerOptions
): Promise<PickingAllocation[]> {
    const excludeBefore = options.excludeExpiredBefore ?? new Date();
    const allocations: PickingAllocation[] = [];
    let remaining = options.quantityNeeded;

    // Pass 1: Expiry-tracked stock — FEFO ordering
    // We exclude stock that expires today or earlier because shipping expired
    // product to a customer is a compliance failure.
    const expiryTrackedStock = await tx.stockItem.findMany({
        where: {
            productId: options.productId,
            warehouseId: options.warehouseId,
            status: "AVAILABLE",
            expiryDate: { not: null, gt: excludeBefore },
        },
        orderBy: { expiryDate: "asc" }, // Earliest expiry first — the core of FEFO
    });

    for (const stockItem of expiryTrackedStock) {
        if (remaining <= 0) {
            break;
        }
        const available =
            Number(stockItem.quantity) - Number(stockItem.reservedQuantity);
        if (available <= 0) {
            continue;
        }

        const toTake = Math.min(available, remaining);
        allocations.push({
            stockItemId: stockItem.id,
            warehouseId: stockItem.warehouseId,
            locationId: stockItem.locationId,
            batchNumber: stockItem.batchNumber,
            serialNumber: stockItem.serialNumber,
            expiryDate: stockItem.expiryDate,
            quantityToTake: toTake,
        });
        remaining -= toTake;
    }

    if (remaining <= 0) {
        return allocations;
    }

    // Pass 2: Non-expiry-tracked stock — FIFO ordering as a tiebreaker
    const nonExpiryStock = await tx.stockItem.findMany({
        where: {
            productId: options.productId,
            warehouseId: options.warehouseId,
            status: "AVAILABLE",
            expiryDate: null, // Only stock with no expiry date
        },
        orderBy: { createdAt: "asc" }, // Oldest received first (FIFO)
    });

    for (const stockItem of nonExpiryStock) {
        if (remaining <= 0) {
            break;
        }
        const available =
            Number(stockItem.quantity) - Number(stockItem.reservedQuantity);
        if (available <= 0) {
            continue;
        }

        const toTake = Math.min(available, remaining);
        allocations.push({
            stockItemId: stockItem.id,
            warehouseId: stockItem.warehouseId,
            locationId: stockItem.locationId,
            batchNumber: stockItem.batchNumber,
            serialNumber: stockItem.serialNumber,
            expiryDate: null,
            quantityToTake: toTake,
        });
        remaining -= toTake;
    }

    // If we still have remaining after both passes, there is insufficient available stock.
    // The caller must handle this case.
    if (remaining > 0) {
        throw new Error(
            `Insufficient available stock. Could only allocate ${options.quantityNeeded - remaining} ` +
                `of ${options.quantityNeeded} units after applying FEFO.`
        );
    }

    return allocations;
}
