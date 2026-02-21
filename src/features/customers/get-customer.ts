import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getCustomerSchema = z.object({
    id: z.string().min(1),
});

export const getCustomer = createServerFn({ method: "GET" })
    .inputValidator(getCustomerSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CUSTOMERS_VIEW_DETAIL)) {
            throw new Error("You do not have permission to view customers.");
        }

        const customer = await prisma.customer.findFirst({
            where: {
                deletedAt: null,
                id: data.id,
            },
            include: {
                _count: {
                    select: {
                        salesOrders: true,
                    },
                },
                salesOrders: {
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

        if (!customer) {
            throw new Error("Customer not found.");
        }

        return customer;
    });
