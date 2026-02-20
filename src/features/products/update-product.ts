import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import {
    assertCategoryExists,
    assertTrackingChangeAllowed,
    assertUniqueProductIdentifiers,
    toMinorUnits,
    toProductAuditSnapshot,
    toSerializableProduct,
} from "@/features/products/product-helpers";
import type { Prisma } from "@/generated/prisma/client";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import {
    type UpdateProductFormData,
    updateProductSchema,
} from "@/schemas/product-schema";

interface AuthorizableUser {
    isActive?: boolean | null;
    role?: string | null;
}

const APPROVER_ROLES = ["MANAGER", "ADMIN", "SUPER_ADMIN"] as const;
type ApproverRole = (typeof APPROVER_ROLES)[number];

const isApproverRole = (
    role: string | null | undefined
): role is ApproverRole =>
    typeof role === "string" &&
    APPROVER_ROLES.includes(role as (typeof APPROVER_ROLES)[number]);

const getRequestChangeType = (
    pricingUpdated: boolean,
    trackingUpdated: boolean
): "PRICE" | "STATUS" | "TRACKING" => {
    if (pricingUpdated) {
        return "PRICE";
    }

    if (trackingUpdated) {
        return "TRACKING";
    }

    return "STATUS";
};

/**
 * Asserts that a user has the necessary permissions to update a product.
 * If the user does not have permission to update the product, throws an error.
 * If the user is trying to update the product's pricing, reorder thresholds, or tracking fields,
 * and does not have permission to do so, throws an error.
 * @param data - The product data being updated.
 * @param user - The user performing the update.
 */
const assertUpdatePermissions = (
    data: UpdateProductFormData,
    user: AuthorizableUser
) => {
    if (!canUser(user, PERMISSIONS.PRODUCTS_EDIT_DETAILS)) {
        throw new Error("You do not have permission to update products.");
    }

    const pricingUpdated =
        data.costPrice !== undefined ||
        data.sellingPrice !== undefined ||
        data.taxRate !== undefined;
    if (pricingUpdated && !canUser(user, PERMISSIONS.PRODUCTS_EDIT_PRICING)) {
        throw new Error(
            "You do not have permission to update product pricing."
        );
    }

    const reorderUpdated =
        data.reorderPoint !== undefined ||
        data.reorderQuantity !== undefined ||
        data.minimumStock !== undefined ||
        data.maximumStock !== undefined;
    if (
        reorderUpdated &&
        !canUser(user, PERMISSIONS.PRODUCTS_EDIT_REORDER_POINTS)
    ) {
        throw new Error(
            "You do not have permission to update reorder thresholds."
        );
    }

    const trackingUpdated =
        data.trackByBatch !== undefined ||
        data.trackByExpiry !== undefined ||
        data.trackBySerialNumber !== undefined;
    if (
        trackingUpdated &&
        !canUser(user, PERMISSIONS.PRODUCTS_EDIT_TRACKING_FLAGS)
    ) {
        throw new Error(
            "You do not have permission to update tracking fields."
        );
    }
    if (
        data.isKit !== undefined &&
        !canUser(user, PERMISSIONS.KITS_CREATE_PRODUCT)
    ) {
        throw new Error(
            "You do not have permission to update kit product settings."
        );
    }

    if (
        data.status !== undefined &&
        data.status !== "ACTIVE" &&
        !canUser(user, PERMISSIONS.PRODUCTS_MARK_INACTIVE)
    ) {
        throw new Error("You do not have permission to update product status.");
    }
};

/**
 * Retrieves an existing product by its ID.
 * If the product does not exist, throws an error.
 * @param productId - The ID of the product to retrieve.
 * @throws {Error} - If the product does not exist.
 * @returns The existing product.
 */
const getExistingProduct = async (productId: string) => {
    const product = await prisma.product.findFirst({
        where: {
            deletedAt: null,
            id: productId,
        },
    });

    if (!product) {
        throw new Error("Product not found.");
    }

    return product;
};

/**
 * Builds an update payload for a product.
 * Converts cost price and selling price from major units to minor units.
 * @param data - The product data being updated.
 * @returns An update payload for a product.
 */
const buildUpdatePayload = (
    data: UpdateProductFormData
): Prisma.ProductUncheckedUpdateInput => ({
    barcode: data.barcode,
    categoryId: data.categoryId,
    costPrice:
        data.costPrice === undefined ? undefined : toMinorUnits(data.costPrice),
    description: data.description,
    dimensions: data.dimensions,
    maximumStock: data.maximumStock,
    minimumStock: data.minimumStock,
    name: data.name,
    reorderPoint: data.reorderPoint,
    reorderQuantity: data.reorderQuantity,
    sellingPrice:
        data.sellingPrice === undefined
            ? undefined
            : toMinorUnits(data.sellingPrice),
    status: data.status,
    sku: data.sku,
    taxRate: data.taxRate,
    trackByBatch: data.trackByBatch,
    trackByExpiry: data.trackByExpiry,
    trackBySerialNumber: data.trackBySerialNumber,
    isKit: data.isKit,
    unit: data.unit,
    weight: data.weight,
    weightUnit: data.weightUnit,
    isActive: data.status === undefined ? undefined : data.status === "ACTIVE",
    deletedAt: (() => {
        if (data.status === undefined) {
            return undefined;
        }

        if (data.status === "ARCHIVED") {
            return new Date();
        }

        return null;
    })(),
});

export const updateProduct = createServerFn({ method: "POST" })
    .inputValidator(updateProductSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        assertUpdatePermissions(data, context.session.user);

        const existingProduct = await getExistingProduct(data.id);
        await assertCategoryExists(data.categoryId);
        await assertUniqueProductIdentifiers({
            barcode: data.barcode,
            currentBarcode: existingProduct.barcode,
            currentSku: existingProduct.sku,
            excludeProductId: data.id,
            sku: data.sku,
        });
        await assertTrackingChangeAllowed(
            data.id,
            {
                trackByBatch: data.trackByBatch,
                trackByExpiry: data.trackByExpiry,
                trackBySerialNumber: data.trackBySerialNumber,
            },
            {
                trackByBatch: existingProduct.trackByBatch,
                trackByExpiry: existingProduct.trackByExpiry,
                trackBySerialNumber: existingProduct.trackBySerialNumber,
            }
        );

        const pricingUpdated =
            data.costPrice !== undefined ||
            data.sellingPrice !== undefined ||
            data.taxRate !== undefined;
        const trackingUpdated =
            data.trackByBatch !== undefined ||
            data.trackByExpiry !== undefined ||
            data.trackBySerialNumber !== undefined;
        const statusUpdated = data.status !== undefined;
        const criticalUpdateRequested =
            pricingUpdated || trackingUpdated || statusUpdated;

        if (
            criticalUpdateRequested &&
            !isApproverRole(context.session.user.role)
        ) {
            const request = await prisma.productChangeRequest.create({
                data: {
                    changeType: getRequestChangeType(
                        pricingUpdated,
                        trackingUpdated
                    ),
                    payload: JSON.parse(
                        JSON.stringify(data)
                    ) as Prisma.InputJsonValue,
                    productId: data.id,
                    requestedById: context.session.user.id,
                },
            });

            await logActivity({
                action: "PRODUCT_CHANGE_REQUEST_CREATED",
                actorUserId: context.session.user.id,
                changes: {
                    changeRequestId: request.id,
                    payload: data,
                },
                entity: "Product",
                entityId: data.id,
                ipAddress: getRequestIpAddress(getRequestHeaders()),
            });

            return {
                pendingApproval: true,
                requestId: request.id,
            };
        }

        const product = await prisma.product.update({
            data: buildUpdatePayload(data),
            include: { category: true },
            where: { id: data.id },
        });

        if (pricingUpdated) {
            await prisma.productPriceHistory.create({
                data: {
                    changedById: context.session.user.id,
                    costPrice: product.costPrice,
                    productId: product.id,
                    reason: "Direct product update",
                    sellingPrice: product.sellingPrice,
                },
            });
        }

        await logActivity({
            action: "PRODUCT_UPDATED",
            actorUserId: context.session.user.id,
            changes: {
                after: toProductAuditSnapshot(product),
                before: toProductAuditSnapshot(existingProduct),
            },
            entity: "Product",
            entityId: product.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return toSerializableProduct(product);
    });
