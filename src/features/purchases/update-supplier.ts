import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const supplierIdSchema = z.object({
    supplierId: z.string().cuid("Invalid supplier id"),
});

const updateSupplierSchema = supplierIdSchema.extend({
    address: z.string().max(500).nullable().optional(),
    city: z.string().max(100).nullable().optional(),
    contactPerson: z.string().max(100).nullable().optional(),
    country: z.string().max(100).nullable().optional(),
    email: z.string().email("Invalid email").nullable().optional(),
    name: z.string().trim().min(1).max(200).optional(),
    paymentTerms: z.string().max(100).nullable().optional(),
    phone: z.string().max(50).nullable().optional(),
    taxId: z.string().max(100).nullable().optional(),
});

const setSupplierActiveSchema = supplierIdSchema.extend({
    isActive: z.boolean(),
});

const deleteSupplierSchema = supplierIdSchema.extend({
    reason: z.string().trim().max(300).optional(),
});

export const updateSupplier = createServerFn({ method: "POST" })
    .inputValidator(updateSupplierSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SUPPLIERS_EDIT)) {
            throw new Error("You do not have permission to update suppliers.");
        }

        const { supplierId, ...changes } = data;
        const before = await prisma.supplier.findFirst({
            where: { deletedAt: null, id: supplierId },
        });
        if (!before) {
            throw new Error("Supplier not found.");
        }

        const updatedSupplier = await prisma.supplier.update({
            data: changes,
            where: { id: supplierId },
        });

        await logActivity({
            action: "SUPPLIER_UPDATED",
            actorUserId: context.session.user.id,
            changes: {
                after: updatedSupplier,
                before,
            },
            entity: "Supplier",
            entityId: supplierId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updatedSupplier;
    });

export const setSupplierActive = createServerFn({ method: "POST" })
    .inputValidator(setSupplierActiveSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SUPPLIERS_DEACTIVATE)) {
            throw new Error(
                "You do not have permission to activate or deactivate suppliers."
            );
        }

        const supplier = await prisma.supplier.findFirst({
            where: { deletedAt: null, id: data.supplierId },
        });
        if (!supplier) {
            throw new Error("Supplier not found.");
        }

        const updatedSupplier = await prisma.supplier.update({
            data: { isActive: data.isActive },
            where: { id: data.supplierId },
        });

        await logActivity({
            action: data.isActive
                ? "SUPPLIER_ACTIVATED"
                : "SUPPLIER_DEACTIVATED",
            actorUserId: context.session.user.id,
            changes: {
                after: { isActive: data.isActive },
                before: { isActive: supplier.isActive },
            },
            entity: "Supplier",
            entityId: data.supplierId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return updatedSupplier;
    });

export const deleteSupplier = createServerFn({ method: "POST" })
    .inputValidator(deleteSupplierSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SUPPLIERS_DELETE)) {
            throw new Error("You do not have permission to delete suppliers.");
        }

        const supplier = await prisma.supplier.findFirst({
            include: {
                purchaseOrders: {
                    select: { id: true, status: true },
                    where: {
                        deletedAt: null,
                        status: {
                            in: [
                                "DRAFT",
                                "SUBMITTED",
                                "APPROVED",
                                "PARTIALLY_RECEIVED",
                            ],
                        },
                    },
                },
            },
            where: { deletedAt: null, id: data.supplierId },
        });

        if (!supplier) {
            throw new Error("Supplier not found.");
        }

        if (supplier.purchaseOrders.length > 0) {
            throw new Error(
                "Supplier cannot be deleted while it has open purchase orders."
            );
        }

        const updatedSupplier = await prisma.supplier.update({
            data: { deletedAt: new Date(), isActive: false },
            where: { id: data.supplierId },
        });

        await logActivity({
            action: "SUPPLIER_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                after: { deletedAt: updatedSupplier.deletedAt },
                before: { deletedAt: supplier.deletedAt },
                reason: data.reason ?? null,
            },
            entity: "Supplier",
            entityId: data.supplierId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return { success: true };
    });
