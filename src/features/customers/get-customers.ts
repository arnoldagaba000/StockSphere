import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getCustomersSchema = z.object({
    archivedOnly: z.boolean().optional().default(false),
    isActive: z.boolean().optional(),
    limit: z.number().int().min(1).max(200).optional().default(100),
    search: z.string().trim().max(100).optional(),
});

export const getCustomers = createServerFn({ method: "GET" })
    .inputValidator(getCustomersSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CUSTOMERS_VIEW_LIST)) {
            throw new Error("You do not have permission to view customers.");
        }

        return await prisma.customer.findMany({
            orderBy: [{ createdAt: "desc" }],
            take: data.limit,
            where: {
                ...(data.archivedOnly
                    ? { deletedAt: { not: null } }
                    : {
                          deletedAt: null,
                          ...(typeof data.isActive === "boolean"
                              ? { isActive: data.isActive }
                              : {}),
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
                              {
                                  email: {
                                      contains: data.search,
                                      mode: "insensitive",
                                  },
                              },
                              {
                                  phone: {
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
