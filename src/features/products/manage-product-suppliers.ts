import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { toMinorUnits } from "./product-helpers";

const toNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? parsedValue : Number.NaN;
};

const productIdInputSchema = z.object({
    productId: z.string().cuid("Invalid product id"),
});

const linkSupplierSchema = z.object({
    costPrice: z.preprocess(
        toNullableNumber,
        z.number().min(0).nullable().optional()
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

const unlinkSupplierSchema = z.object({
    productId: z.string().cuid("Invalid product id"),
    supplierId: z.string().cuid("Invalid supplier id"),
});

export const listProductSuppliers = createServerFn({ method: "GET" })
    .inputValidator(productIdInputSchema)
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

        const suppliers = await prisma.productSupplier.findMany({
            include: {
                supplier: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
            orderBy: [{ isPreferred: "desc" }, { createdAt: "asc" }],
            where: {
                productId: data.productId,
            },
        });

        return suppliers.map((supplierLink) => ({
            ...supplierLink,
            minimumOrderQty: supplierLink.minimumOrderQty?.toString() ?? null,
        }));
    });

export const linkSupplierToProduct = createServerFn({ method: "POST" })
    .inputValidator(linkSupplierSchema)
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

        const result = await prisma.$transaction(async (transaction) => {
            if (data.isPreferred) {
                await transaction.productSupplier.updateMany({
                    data: {
                        isPreferred: false,
                    },
                    where: {
                        productId: data.productId,
                    },
                });
            }

            return transaction.productSupplier.upsert({
                create: {
                    costPrice: toMinorUnits(data.costPrice),
                    isPreferred: data.isPreferred ?? false,
                    leadTimeDays: data.leadTimeDays,
                    minimumOrderQty: minimumOrderQtyAsString,
                    productId: data.productId,
                    supplierId: data.supplierId,
                    supplierSku: data.supplierSku,
                },
                update: {
                    costPrice: toMinorUnits(data.costPrice),
                    isPreferred: data.isPreferred ?? false,
                    leadTimeDays: data.leadTimeDays,
                    minimumOrderQty: minimumOrderQtyAsString,
                    supplierSku: data.supplierSku,
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
            action: "PRODUCT_SUPPLIER_LINKED",
            actorUserId: context.session.user.id,
            changes: {
                isPreferred: data.isPreferred ?? false,
                productId: data.productId,
                supplierId: data.supplierId,
            },
            entity: "Product",
            entityId: data.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return {
            ...result,
            minimumOrderQty: result.minimumOrderQty?.toString() ?? null,
        };
    });

export const unlinkSupplierFromProduct = createServerFn({ method: "POST" })
    .inputValidator(unlinkSupplierSchema)
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
            action: "PRODUCT_SUPPLIER_UNLINKED",
            actorUserId: context.session.user.id,
            changes: {
                productId: data.productId,
                supplierId: data.supplierId,
            },
            entity: "Product",
            entityId: data.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
