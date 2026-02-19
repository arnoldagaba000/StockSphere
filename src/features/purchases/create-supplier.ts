import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { supplierSchema } from "@/schemas/supplier-schema";

export const createSupplier = createServerFn({ method: "POST" })
    .inputValidator(supplierSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.SUPPLIERS_CREATE)) {
            throw new Error("You do not have permission to create suppliers.");
        }

        const existingSupplier = await prisma.supplier.findUnique({
            select: { id: true },
            where: { code: data.code },
        });
        if (existingSupplier) {
            throw new Error(
                `A supplier with code "${data.code}" already exists.`
            );
        }

        const supplier = await prisma.supplier.create({
            data: {
                address: data.address ?? null,
                city: data.city ?? null,
                code: data.code,
                contactPerson: data.contactPerson ?? null,
                country: data.country ?? null,
                email: data.email ?? null,
                isActive: data.isActive,
                name: data.name,
                paymentTerms: data.paymentTerms ?? null,
                phone: data.phone ?? null,
                taxId: data.taxId ?? null,
            },
        });

        await logActivity({
            action: "SUPPLIER_CREATED",
            actorUserId: context.session.user.id,
            changes: { after: supplier },
            entity: "Supplier",
            entityId: supplier.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return supplier;
    });
