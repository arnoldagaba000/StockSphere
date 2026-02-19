import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const listProductMediaSchema = z.object({
    productId: z.string().cuid(),
});

const addProductMediaSchema = z.object({
    altText: z.string().trim().max(200).nullable().optional(),
    isPrimary: z.boolean().optional().default(false),
    productId: z.string().cuid(),
    sortOrder: z.number().int().min(0).default(0),
    url: z.string().trim().url(),
});

const deleteProductMediaSchema = z.object({
    mediaId: z.string().cuid(),
    productId: z.string().cuid(),
});

const setPrimaryProductMediaSchema = z.object({
    mediaId: z.string().cuid(),
    productId: z.string().cuid(),
});

export const listProductMedia = createServerFn({ method: "GET" })
    .inputValidator(listProductMediaSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_DETAIL)) {
            throw new Error(
                "You do not have permission to view product media."
            );
        }

        return await prisma.productMedia.findMany({
            orderBy: [{ isPrimary: "desc" }, { sortOrder: "asc" }],
            where: {
                productId: data.productId,
            },
        });
    });

export const addProductMedia = createServerFn({ method: "POST" })
    .inputValidator(addProductMediaSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EDIT_DETAILS)) {
            throw new Error(
                "You do not have permission to manage product media."
            );
        }

        const media = await prisma.$transaction(async (transaction) => {
            if (data.isPrimary) {
                await transaction.productMedia.updateMany({
                    data: {
                        isPrimary: false,
                    },
                    where: {
                        productId: data.productId,
                    },
                });
            }

            return transaction.productMedia.create({
                data: {
                    altText: data.altText,
                    isPrimary: data.isPrimary,
                    productId: data.productId,
                    sortOrder: data.sortOrder,
                    url: data.url,
                },
            });
        });

        await logActivity({
            action: "PRODUCT_MEDIA_ADDED",
            actorUserId: context.session.user.id,
            changes: {
                mediaId: media.id,
                productId: data.productId,
            },
            entity: "Product",
            entityId: data.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return media;
    });

export const deleteProductMedia = createServerFn({ method: "POST" })
    .inputValidator(deleteProductMediaSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EDIT_DETAILS)) {
            throw new Error(
                "You do not have permission to manage product media."
            );
        }

        const existingMedia = await prisma.productMedia.findFirst({
            select: { id: true },
            where: {
                id: data.mediaId,
                productId: data.productId,
            },
        });
        if (!existingMedia) {
            throw new Error("Product media not found.");
        }

        await prisma.productMedia.delete({
            where: {
                id: data.mediaId,
            },
        });

        await logActivity({
            action: "PRODUCT_MEDIA_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                mediaId: data.mediaId,
                productId: data.productId,
            },
            entity: "Product",
            entityId: data.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });

export const setPrimaryProductMedia = createServerFn({ method: "POST" })
    .inputValidator(setPrimaryProductMediaSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EDIT_DETAILS)) {
            throw new Error(
                "You do not have permission to manage product media."
            );
        }

        const existingMedia = await prisma.productMedia.findFirst({
            select: { id: true },
            where: {
                id: data.mediaId,
                productId: data.productId,
            },
        });
        if (!existingMedia) {
            throw new Error("Product media not found.");
        }

        await prisma.$transaction([
            prisma.productMedia.updateMany({
                data: {
                    isPrimary: false,
                },
                where: {
                    productId: data.productId,
                },
            }),
            prisma.productMedia.update({
                data: {
                    isPrimary: true,
                },
                where: {
                    id: data.mediaId,
                },
            }),
        ]);

        await logActivity({
            action: "PRODUCT_MEDIA_PRIMARY_SET",
            actorUserId: context.session.user.id,
            changes: {
                mediaId: data.mediaId,
                productId: data.productId,
            },
            entity: "Product",
            entityId: data.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
