import { prisma } from "@/db";

type ProductWeight = { toString(): string } | null;

interface ProductWithWeight {
    weight: ProductWeight;
}

interface UniqueIdentifierOptions {
    barcode?: string | null;
    currentBarcode?: string | null;
    currentSku?: string;
    excludeProductId?: string;
    sku?: string;
}

interface ProductAuditShape {
    barcode: string | null;
    categoryId: string | null;
    id: string;
    name: string;
    sku: string;
}

export const toMinorUnits = (
    value: number | null | undefined
): number | null => (value == null ? null : Math.round(value * 100));

export const toSerializableProduct = <TProduct extends ProductWithWeight>(
    product: TProduct
): Omit<TProduct, "weight"> & { weight: string | null } => ({
    ...product,
    weight: product.weight?.toString() ?? null,
});

export const toProductAuditSnapshot = (
    product: ProductAuditShape
): Record<string, string | null> => ({
    barcode: product.barcode,
    categoryId: product.categoryId,
    id: product.id,
    name: product.name,
    sku: product.sku,
});

export const assertCategoryExists = async (
    categoryId: string | null | undefined
): Promise<void> => {
    if (!categoryId) {
        return;
    }

    const category = await prisma.category.findFirst({
        where: { deletedAt: null, id: categoryId },
        select: { id: true },
    });
    if (!category) {
        throw new Error("Selected category does not exist.");
    }
};

export const assertUniqueProductIdentifiers = async ({
    barcode,
    currentBarcode,
    currentSku,
    excludeProductId,
    sku,
}: UniqueIdentifierOptions): Promise<void> => {
    if (sku && sku !== currentSku) {
        const duplicateSkuProduct = await prisma.product.findUnique({
            where: { sku },
            select: { id: true },
        });
        if (
            duplicateSkuProduct &&
            duplicateSkuProduct.id !== excludeProductId
        ) {
            throw new Error(`A product with SKU "${sku}" already exists.`);
        }
    }

    if (barcode && barcode !== currentBarcode) {
        const duplicateBarcodeProduct = await prisma.product.findUnique({
            where: { barcode },
            select: { id: true },
        });
        if (
            duplicateBarcodeProduct &&
            duplicateBarcodeProduct.id !== excludeProductId
        ) {
            throw new Error(
                `A product with barcode "${barcode}" already exists.`
            );
        }
    }
};
