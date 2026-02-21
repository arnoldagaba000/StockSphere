import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getSupplierSchema = z.object({
    id: z.string().min(1),
});

export const getSupplier = createServerFn({ method: "GET" })
    .inputValidator(getSupplierSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SUPPLIERS_VIEW_DETAIL)) {
            throw new Error("You do not have permission to view suppliers.");
        }

        const supplier = await prisma.supplier.findFirst({
            where: {
                id: data.id,
            },
            include: {
                _count: {
                    select: {
                        products: true,
                        purchaseOrders: true,
                    },
                },
                purchaseOrders: {
                    orderBy: [{ orderDate: "desc" }],
                    select: {
                        id: true,
                        orderDate: true,
                        orderNumber: true,
                        status: true,
                        totalAmount: true,
                    },
                    take: 10,
                    where: { deletedAt: null },
                },
            },
        });

        if (!supplier) {
            throw new Error("Supplier not found.");
        }

        return supplier;
    });
