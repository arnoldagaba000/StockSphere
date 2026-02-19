import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { warehouseSchema } from "@/schemas/warehouse-schema";

export const createWarehouse = createServerFn({ method: "POST" })
    .inputValidator(warehouseSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.WAREHOUSES_CREATE)) {
            throw new Error("You do not have permission to create warehouses.");
        }

        const existing = await prisma.warehouse.findUnique({
            where: { code: data.code },
        });
        if (existing) {
            throw new Error(
                `A warehouse with code "${data.code}" already exists`
            );
        }

        const warehouse = await prisma.warehouse.create({
            data: {
                address: data.address ?? null,
                code: data.code,
                country: data.country,
                district: data.district ?? null,
                isActive: data.isActive,
                name: data.name,
                postalCode: data.postalCode ?? null,
            },
        });

        await logActivity({
            action: "WAREHOUSE_CREATED",
            actorUserId: context.session.user.id,
            changes: { after: warehouse },
            entity: "Warehouse",
            entityId: warehouse.id,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return warehouse;
    });
