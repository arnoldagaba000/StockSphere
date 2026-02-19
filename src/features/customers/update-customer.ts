import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const nullableTrimmedString = (max: number) =>
    z.string().trim().max(max).nullable().optional();

const updateCustomerInputSchema = z.object({
    address: nullableTrimmedString(500),
    city: nullableTrimmedString(100),
    country: nullableTrimmedString(100),
    creditLimit: z.number().int().min(0).nullable().optional(),
    customerId: z.string().min(1),
    email: z.string().trim().email().nullable().optional(),
    name: z.string().trim().min(1).max(200),
    paymentTerms: nullableTrimmedString(50),
    phone: nullableTrimmedString(50),
    taxId: nullableTrimmedString(100),
});

const setCustomerActiveInputSchema = z.object({
    customerId: z.string().min(1),
    isActive: z.boolean(),
});

const deleteCustomerInputSchema = z.object({
    customerId: z.string().min(1),
});

export const updateCustomer = createServerFn({ method: "POST" })
    .inputValidator(updateCustomerInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CUSTOMERS_EDIT)) {
            throw new Error("You do not have permission to edit customers.");
        }

        const customer = await prisma.customer.findFirst({
            where: { deletedAt: null, id: data.customerId },
        });
        if (!customer) {
            throw new Error("Customer not found.");
        }

        const updated = await prisma.customer.update({
            data: {
                address: data.address ?? null,
                city: data.city ?? null,
                country: data.country ?? null,
                creditLimit: data.creditLimit ?? null,
                email: data.email ?? null,
                name: data.name,
                paymentTerms: data.paymentTerms ?? null,
                phone: data.phone ?? null,
                taxId: data.taxId ?? null,
            },
            where: { id: customer.id },
        });

        await logActivity({
            action: "CUSTOMER_UPDATED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    creditLimit: updated.creditLimit,
                    email: updated.email,
                    isActive: updated.isActive,
                    name: updated.name,
                },
                before: {
                    creditLimit: customer.creditLimit,
                    email: customer.email,
                    isActive: customer.isActive,
                    name: customer.name,
                },
            },
            entity: "Customer",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updated;
    });

export const setCustomerActive = createServerFn({ method: "POST" })
    .inputValidator(setCustomerActiveInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const permission = data.isActive
            ? PERMISSIONS.CUSTOMERS_EDIT
            : PERMISSIONS.CUSTOMERS_DEACTIVATE;

        if (!canUser(context.session.user, permission)) {
            throw new Error(
                "You do not have permission to change customer status."
            );
        }

        const customer = await prisma.customer.findFirst({
            where: { deletedAt: null, id: data.customerId },
        });
        if (!customer) {
            throw new Error("Customer not found.");
        }

        const updated = await prisma.customer.update({
            data: { isActive: data.isActive },
            where: { id: customer.id },
        });

        await logActivity({
            action: data.isActive
                ? "CUSTOMER_REACTIVATED"
                : "CUSTOMER_DEACTIVATED",
            actorUserId: context.session.user.id,
            changes: {
                after: { isActive: updated.isActive },
                before: { isActive: customer.isActive },
            },
            entity: "Customer",
            entityId: updated.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updated;
    });

export const deleteCustomer = createServerFn({ method: "POST" })
    .inputValidator(deleteCustomerInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.CUSTOMERS_DELETE)) {
            throw new Error("You do not have permission to delete customers.");
        }

        const customer = await prisma.customer.findFirst({
            where: { deletedAt: null, id: data.customerId },
        });
        if (!customer) {
            throw new Error("Customer not found.");
        }

        const openOrderCount = await prisma.salesOrder.count({
            where: {
                customerId: customer.id,
                deletedAt: null,
                status: {
                    in: [
                        "DRAFT",
                        "CONFIRMED",
                        "PARTIALLY_FULFILLED",
                        "FULFILLED",
                        "SHIPPED",
                    ],
                },
            },
        });
        if (openOrderCount > 0) {
            throw new Error(
                "Cannot delete customer with active sales orders. Cancel or close those orders first."
            );
        }

        const deleted = await prisma.customer.update({
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
            where: { id: customer.id },
        });

        await logActivity({
            action: "CUSTOMER_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                after: {
                    deletedAt: deleted.deletedAt,
                    isActive: deleted.isActive,
                },
                before: {
                    deletedAt: customer.deletedAt,
                    isActive: customer.isActive,
                },
            },
            entity: "Customer",
            entityId: deleted.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
