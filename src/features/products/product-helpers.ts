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
    costPrice?: number | null;
    id: string;
    isActive?: boolean;
    name: string;
    sellingPrice?: number | null;
    status?: string;
    sku: string;
    taxRate?: number | null;
}

export const toMinorUnits = (
    value: number | null | undefined
): number | null => (value == null ? null : Math.round(value));

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
    costPrice:
        typeof product.costPrice === "number"
            ? String(product.costPrice)
            : null,
    id: product.id,
    isActive: String(product.isActive ?? true),
    name: product.name,
    sellingPrice:
        typeof product.sellingPrice === "number"
            ? String(product.sellingPrice)
            : null,
    status: product.status ?? null,
    sku: product.sku,
    taxRate:
        typeof product.taxRate === "number" ? String(product.taxRate) : null,
});

export const assertTrackingChangeAllowed = async (
    productId: string,
    nextTrackingConfig: {
        trackByBatch?: boolean;
        trackByExpiry?: boolean;
        trackBySerialNumber?: boolean;
    },
    currentTrackingConfig: {
        trackByBatch: boolean;
        trackByExpiry: boolean;
        trackBySerialNumber: boolean;
    }
): Promise<void> => {
    const nextTrackByBatch =
        nextTrackingConfig.trackByBatch ?? currentTrackingConfig.trackByBatch;
    const nextTrackByExpiry =
        nextTrackingConfig.trackByExpiry ?? currentTrackingConfig.trackByExpiry;
    const nextTrackBySerialNumber =
        nextTrackingConfig.trackBySerialNumber ??
        currentTrackingConfig.trackBySerialNumber;

    const trackingChanged =
        nextTrackByBatch !== currentTrackingConfig.trackByBatch ||
        nextTrackByExpiry !== currentTrackingConfig.trackByExpiry ||
        nextTrackBySerialNumber !== currentTrackingConfig.trackBySerialNumber;

    if (!trackingChanged) {
        return;
    }

    const stockItemCount = await prisma.stockItem.count({
        where: {
            productId,
        },
    });

    if (stockItemCount > 0) {
        throw new Error(
            "Tracking settings cannot be changed after stock has been recorded for this product."
        );
    }
};

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
