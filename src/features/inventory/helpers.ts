import { prisma } from "@/db";
import type { Prisma, StockItem } from "@/generated/prisma/client";

export const toNumber = (value: Prisma.Decimal | number): number =>
    Number(value);

export const assertPositiveQuantity = (value: number, fieldName: string) => {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`${fieldName} must be greater than zero.`);
    }
};

export const getStockItemOrThrow = async (
    stockItemId: string
): Promise<StockItem> => {
    const stockItem = await prisma.stockItem.findUnique({
        where: { id: stockItemId },
    });
    if (!stockItem) {
        throw new Error("Stock item not found.");
    }
    return stockItem;
};
