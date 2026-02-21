import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getSuppliersInputSchema = z.object({
    archivedOnly: z.boolean().optional().default(false),
    includeInactive: z.boolean().optional().default(false),
    search: z.string().trim().max(100).optional(),
});

export const getSuppliers = createServerFn({ method: "GET" })
    .inputValidator(getSuppliersInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SUPPLIERS_VIEW_LIST)) {
            throw new Error("You do not have permission to view suppliers.");
        }

        return await prisma.supplier.findMany({
            include: {
                _count: { select: { purchaseOrders: true, products: true } },
            },
            orderBy: [{ name: "asc" }],
            where: {
                ...(data.archivedOnly
                    ? { deletedAt: { not: null } }
                    : {
                          deletedAt: null,
                          ...(data.includeInactive ? {} : { isActive: true }),
                      }),
                ...(data.search
                    ? {
                          OR: [
                              {
                                  code: {
                                      contains: data.search,
                                      mode: "insensitive",
                                  },
                              },
                              {
                                  name: {
                                      contains: data.search,
                                      mode: "insensitive",
                                  },
                              },
                          ],
                      }
                    : {}),
            },
        });
    });
