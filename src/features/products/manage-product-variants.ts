import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const toNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? Math.round(parsedValue) : Number.NaN;
};

const listProductVariantsSchema = z.object({
    productId: z.string().cuid(),
});

const upsertProductVariantSchema = z.object({
    attributes: z.record(z.string(), z.string()),
    barcode: z.string().trim().max(50).nullable().optional(),
    costPrice: z.preprocess(
        toNullableNumber,
        z.number().min(0).nullable().optional()
    ),
    id: z.string().cuid().optional(),
    isActive: z.boolean().default(true),
    name: z.string().trim().min(1).max(120),
    productId: z.string().cuid(),
    sellingPrice: z.preprocess(
        toNullableNumber,
        z.number().min(0).nullable().optional()
    ),
    sku: z.string().trim().min(1).max(50),
});

const deleteProductVariantSchema = z.object({
    id: z.string().cuid(),
    productId: z.string().cuid(),
});

export const listProductVariants = createServerFn({ method: "GET" })
    .inputValidator(listProductVariantsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_DETAIL)) {
            throw new Error(
                "You do not have permission to view product variants."
            );
        }

        return await prisma.productVariant.findMany({
            orderBy: [{ createdAt: "asc" }],
            where: { productId: data.productId },
        });
    });

export const upsertProductVariant = createServerFn({ method: "POST" })
    .inputValidator(upsertProductVariantSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EDIT_DETAILS)) {
            throw new Error(
                "You do not have permission to manage product variants."
            );
        }

        const result = data.id
            ? await (async () => {
                  const existingVariant = await prisma.productVariant.findFirst(
                      {
                          select: { id: true },
                          where: {
                              id: data.id,
                              productId: data.productId,
                          },
                      }
                  );
                  if (!existingVariant) {
                      throw new Error("Variant not found.");
                  }

                  return prisma.productVariant.update({
                      data: {
                          attributes: data.attributes,
                          barcode: data.barcode,
                          costPrice: data.costPrice,
                          isActive: data.isActive,
                          name: data.name,
                          sellingPrice: data.sellingPrice,
                          sku: data.sku,
                      },
                      where: {
                          id: data.id,
                      },
                  });
              })()
            : await prisma.productVariant.create({
                  data: {
                      attributes: data.attributes,
                      barcode: data.barcode,
                      costPrice: data.costPrice,
                      isActive: data.isActive,
                      name: data.name,
                      productId: data.productId,
                      sellingPrice: data.sellingPrice,
                      sku: data.sku,
                  },
              });

        await logActivity({
            action: data.id
                ? "PRODUCT_VARIANT_UPDATED"
                : "PRODUCT_VARIANT_CREATED",
            actorUserId: context.session.user.id,
            changes: {
                productId: data.productId,
                variantId: result.id,
            },
            entity: "Product",
            entityId: data.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return result;
    });

export const deleteProductVariant = createServerFn({ method: "POST" })
    .inputValidator(deleteProductVariantSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EDIT_DETAILS)) {
            throw new Error(
                "You do not have permission to manage product variants."
            );
        }

        const existingVariant = await prisma.productVariant.findFirst({
            select: { id: true },
            where: {
                id: data.id,
                productId: data.productId,
            },
        });
        if (!existingVariant) {
            throw new Error("Variant not found.");
        }

        await prisma.productVariant.delete({
            where: {
                id: data.id,
            },
        });

        await logActivity({
            action: "PRODUCT_VARIANT_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                productId: data.productId,
                variantId: data.id,
            },
            entity: "Product",
            entityId: data.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
