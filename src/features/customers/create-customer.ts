import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { customerSchema } from "@/schemas/customer-schema";

export const createCustomer = createServerFn({ method: "POST" })
    .inputValidator(customerSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CUSTOMERS_CREATE)) {
            throw new Error("You do not have permission to create customers.");
        }

        const normalizedCode = data.code.trim().toUpperCase();

        const existingCustomer = await prisma.customer.findUnique({
            where: { code: normalizedCode },
        });
        if (existingCustomer && !existingCustomer.deletedAt) {
            throw new Error(
                `A customer with code "${normalizedCode}" already exists.`
            );
        }

        const customer = await prisma.customer.create({
            data: {
                address: data.address ?? null,
                city: data.city ?? null,
                code: normalizedCode,
                country: data.country ?? null,
                creditLimit: data.creditLimit ?? null,
                email: data.email ?? null,
                isActive: data.isActive,
                name: data.name,
                paymentTerms: data.paymentTerms ?? null,
                phone: data.phone ?? null,
                taxId: data.taxId ?? null,
            },
        });

        await logActivity({
            action: "CUSTOMER_CREATED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    code: customer.code,
                    creditLimit: customer.creditLimit,
                    isActive: customer.isActive,
                    name: customer.name,
                },
            },
            entity: "Customer",
            entityId: customer.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return customer;
    });
