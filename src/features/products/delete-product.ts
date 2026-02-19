import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const deleteProductSchema = z.object({
    hardDelete: z.boolean().optional().default(false),
    id: z.cuid("Invalid product id"),
});

export const deleteProduct = createServerFn({ method: "POST" })
    .inputValidator(deleteProductSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const requiredPermission = data.hardDelete
            ? PERMISSIONS.PRODUCTS_DELETE_HARD
            : PERMISSIONS.PRODUCTS_MARK_INACTIVE;

        if (!canUser(context.session.user, requiredPermission)) {
            throw new Error("You do not have permission to delete products.");
        }

        const existingProduct = await prisma.product.findFirst({
            where: { deletedAt: null, id: data.id },
            select: { id: true, name: true, sku: true },
        });
        if (!existingProduct) {
            throw new Error("Product not found.");
        }

        if (data.hardDelete) {
            await prisma.product.delete({
                where: { id: data.id },
            });
        } else {
            await prisma.product.update({
                data: {
                    deletedAt: new Date(),
                    isActive: false,
                },
                where: { id: data.id },
            });
        }

        await logActivity({
            action: data.hardDelete
                ? "PRODUCT_DELETED_HARD"
                : "PRODUCT_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                hardDelete: data.hardDelete,
                productName: existingProduct.name,
                sku: existingProduct.sku,
            },
            entity: "Product",
            entityId: data.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
