import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { toMinorUnits } from "@/features/products/product-helpers";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const toNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }
    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

const linkProductToSupplierSchema = z.object({
    costPrice: z.preprocess(
        toNullableNumber,
        z.number().int().min(0).nullable().optional()
    ),
    isPreferred: z.boolean().optional().default(false),
    leadTimeDays: z.preprocess(
        toNullableNumber,
        z.number().int().min(0).nullable().optional()
    ),
    minimumOrderQty: z.preprocess(
        toNullableNumber,
        z.number().min(0).nullable().optional()
    ),
    productId: z.string().cuid("Invalid product id"),
    supplierId: z.string().cuid("Invalid supplier id"),
    supplierSku: z.string().trim().max(100).nullable().optional(),
});

const unlinkProductSupplierSchema = z.object({
    productId: z.string().cuid("Invalid product id"),
    supplierId: z.string().cuid("Invalid supplier id"),
});

export const linkProductToSupplier = createServerFn({ method: "POST" })
    .inputValidator(linkProductToSupplierSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.SUPPLIERS_MANAGE_PRODUCT_LINKS
            )
        ) {
            throw new Error(
                "You do not have permission to manage product supplier links."
            );
        }

        const [product, supplier] = await Promise.all([
            prisma.product.findFirst({
                select: { id: true },
                where: { deletedAt: null, id: data.productId },
            }),
            prisma.supplier.findFirst({
                select: { id: true },
                where: { deletedAt: null, id: data.supplierId, isActive: true },
            }),
        ]);

        if (!product) {
            throw new Error("Product not found.");
        }
        if (!supplier) {
            throw new Error("Supplier not found.");
        }

        const minimumOrderQtyAsString =
            data.minimumOrderQty == null ? null : String(data.minimumOrderQty);

        const supplierLink = await prisma.$transaction(async (tx) => {
            if (data.isPreferred) {
                await tx.productSupplier.updateMany({
                    data: { isPreferred: false },
                    where: { productId: data.productId },
                });
            }

            return await tx.productSupplier.upsert({
                create: {
                    costPrice: toMinorUnits(data.costPrice),
                    isPreferred: data.isPreferred,
                    leadTimeDays: data.leadTimeDays,
                    minimumOrderQty: minimumOrderQtyAsString,
                    productId: data.productId,
                    supplierId: data.supplierId,
                    supplierSku: data.supplierSku ?? null,
                },
                update: {
                    costPrice: toMinorUnits(data.costPrice),
                    isPreferred: data.isPreferred,
                    leadTimeDays: data.leadTimeDays,
                    minimumOrderQty: minimumOrderQtyAsString,
                    supplierSku: data.supplierSku ?? null,
                },
                where: {
                    productId_supplierId: {
                        productId: data.productId,
                        supplierId: data.supplierId,
                    },
                },
            });
        });

        await logActivity({
            action: "SUPPLIER_PRODUCT_LINKED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    productId: data.productId,
                    supplierId: data.supplierId,
                },
            },
            entity: "ProductSupplier",
            entityId: supplierLink.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            ...supplierLink,
            minimumOrderQty: supplierLink.minimumOrderQty?.toString() ?? null,
        };
    });

export const unlinkProductFromSupplier = createServerFn({ method: "POST" })
    .inputValidator(unlinkProductSupplierSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.SUPPLIERS_MANAGE_PRODUCT_LINKS
            )
        ) {
            throw new Error(
                "You do not have permission to manage product supplier links."
            );
        }

        await prisma.productSupplier.delete({
            where: {
                productId_supplierId: {
                    productId: data.productId,
                    supplierId: data.supplierId,
                },
            },
        });

        await logActivity({
            action: "SUPPLIER_PRODUCT_UNLINKED",
            actorUserId: context.session.user.id,
            changes: {
                before: {
                    productId: data.productId,
                    supplierId: data.supplierId,
                },
            },
            entity: "ProductSupplier",
            entityId: `${data.productId}:${data.supplierId}`,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
