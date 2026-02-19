import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import {
    assertCategoryExists,
    assertUniqueProductIdentifiers,
    toMinorUnits,
    toProductAuditSnapshot,
    toSerializableProduct,
} from "@/features/products/product-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { productSchema } from "@/schemas/product-schema";

export const createProduct = createServerFn({ method: "POST" })
    .inputValidator(productSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_CREATE)) {
            throw new Error("You do not have permission to create products.");
        }

        await assertCategoryExists(data.categoryId);
        await assertUniqueProductIdentifiers({
            barcode: data.barcode,
            sku: data.sku,
        });

        const product = await prisma.product.create({
            data: {
                barcode: data.barcode ?? null,
                categoryId: data.categoryId ?? null,
                costPrice: toMinorUnits(data.costPrice),
                createdById: context.session.user.id,
                deletedAt: data.status === "ARCHIVED" ? new Date() : null,
                description: data.description ?? null,
                isActive: data.status === "ACTIVE",
                dimensions: data.dimensions ?? null,
                maximumStock: data.maximumStock ?? null,
                minimumStock: data.minimumStock ?? 0,
                name: data.name,
                reorderPoint: data.reorderPoint ?? 0,
                reorderQuantity: data.reorderQuantity ?? null,
                sellingPrice: toMinorUnits(data.sellingPrice),
                sku: data.sku,
                status: data.status,
                taxRate: data.taxRate ?? null,
                trackByBatch: data.trackByBatch,
                trackByExpiry: data.trackByExpiry,
                trackBySerialNumber: data.trackBySerialNumber,
                unit: data.unit,
                weight: data.weight ?? null,
                weightUnit: data.weightUnit ?? null,
            },
            include: { category: true },
        });

        await prisma.productPriceHistory.create({
            data: {
                changedById: context.session.user.id,
                costPrice: product.costPrice,
                productId: product.id,
                reason: "Initial product pricing",
                sellingPrice: product.sellingPrice,
            },
        });

        await logActivity({
            action: "PRODUCT_CREATED",
            actorUserId: context.session.user.id,
            changes: {
                after: toProductAuditSnapshot(product),
            },
            entity: "Product",
            entityId: product.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return toSerializableProduct(product);
    });
