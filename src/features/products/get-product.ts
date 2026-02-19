import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { toSerializableProduct } from "@/features/products/product-helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getProductInputSchema = z.object({
    id: z.cuid("Invalid product id"),
});

export const getProduct = createServerFn({ method: "GET" })
    .inputValidator(getProductInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_DETAIL)) {
            throw new Error(
                "You do not have permission to view product details."
            );
        }

        const product = await prisma.product.findFirst({
            include: { category: true },
            where: { deletedAt: null, id: data.id },
        });

        if (!product) {
            throw new Error("Product not found.");
        }

        return toSerializableProduct(product);
    });
