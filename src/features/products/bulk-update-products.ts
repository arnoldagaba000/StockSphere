import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const bulkUpdateProductsSchema = z
    .object({
        action: z.enum(["activate", "assignCategory", "markInactive"]),
        categoryId: z.string().cuid().optional(),
        productIds: z.array(z.string().cuid()).min(1),
    })
    .superRefine((data, ctx) => {
        if (data.action === "assignCategory" && !data.categoryId) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Category is required for assign category action.",
                path: ["categoryId"],
            });
        }
    });

export const bulkUpdateProducts = createServerFn({ method: "POST" })
    .inputValidator(bulkUpdateProductsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const { productIds } = data;
        const uniqueProductIds = [...new Set(productIds)];

        const headers = getRequestHeaders();
        const ipAddress = getRequestIpAddress(headers);

        if (data.action === "assignCategory") {
            if (
                !canUser(
                    context.session.user,
                    PERMISSIONS.PRODUCTS_EDIT_DETAILS
                )
            ) {
                throw new Error(
                    "You do not have permission to bulk assign product categories."
                );
            }

            const category = await prisma.category.findFirst({
                select: { id: true },
                where: { deletedAt: null, id: data.categoryId },
            });
            if (!category) {
                throw new Error("Selected category does not exist.");
            }

            const result = await prisma.product.updateMany({
                data: { categoryId: category.id },
                where: {
                    deletedAt: null,
                    id: { in: uniqueProductIds },
                },
            });

            await logActivity({
                action: "PRODUCTS_BULK_ASSIGNED_CATEGORY",
                actorUserId: context.session.user.id,
                changes: {
                    categoryId: category.id,
                    count: result.count,
                    productIds: uniqueProductIds,
                },
                entity: "Product",
                entityId: "bulk",
                ipAddress,
            });

            return { affectedCount: result.count };
        }

        if (data.action === "markInactive") {
            if (
                !canUser(
                    context.session.user,
                    PERMISSIONS.PRODUCTS_MARK_INACTIVE
                )
            ) {
                throw new Error(
                    "You do not have permission to bulk mark products inactive."
                );
            }

            const now = new Date();
            const result = await prisma.product.updateMany({
                data: { deletedAt: now, isActive: false },
                where: {
                    deletedAt: null,
                    id: { in: uniqueProductIds },
                },
            });

            await logActivity({
                action: "PRODUCTS_BULK_MARKED_INACTIVE",
                actorUserId: context.session.user.id,
                changes: {
                    count: result.count,
                    productIds: uniqueProductIds,
                },
                entity: "Product",
                entityId: "bulk",
                ipAddress,
            });

            return { affectedCount: result.count };
        }

        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EDIT_DETAILS)) {
            throw new Error(
                "You do not have permission to bulk activate products."
            );
        }

        const result = await prisma.product.updateMany({
            data: { deletedAt: null, isActive: true },
            where: {
                id: { in: uniqueProductIds },
            },
        });

        await logActivity({
            action: "PRODUCTS_BULK_ACTIVATED",
            actorUserId: context.session.user.id,
            changes: {
                count: result.count,
                productIds: uniqueProductIds,
            },
            entity: "Product",
            entityId: "bulk",
            ipAddress,
        });

        return { affectedCount: result.count };
    });
