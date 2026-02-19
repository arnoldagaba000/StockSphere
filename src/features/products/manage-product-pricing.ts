import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { z } from "zod";
import { prisma } from "@/db";
import type { ProductStatus } from "@/generated/prisma/enums";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const toNullableNumber = (value: unknown): number | null => {
    if (value === null || value === undefined || value === "") {
        return null;
    }

    const parsedValue = Number(value);
    return Number.isFinite(parsedValue) ? Math.round(parsedValue) : Number.NaN;
};

const APPROVER_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;
type ApproverRole = (typeof APPROVER_ROLES)[number];

const isApproverRole = (
    role: string | null | undefined
): role is ApproverRole =>
    typeof role === "string" &&
    APPROVER_ROLES.includes(role as (typeof APPROVER_ROLES)[number]);

const parseProductStatus = (value: unknown): ProductStatus | null => {
    if (
        value === "ACTIVE" ||
        value === "ARCHIVED" ||
        value === "DISCONTINUED" ||
        value === "DRAFT"
    ) {
        return value;
    }

    return null;
};

const listSchedulesSchema = z.object({
    productId: z.string().cuid(),
});

const createScheduleSchema = z.object({
    costPrice: z.preprocess(
        toNullableNumber,
        z.number().min(0).nullable().optional()
    ),
    effectiveAt: z.coerce.date(),
    productId: z.string().cuid(),
    reason: z.string().trim().max(240).nullable().optional(),
    sellingPrice: z.preprocess(
        toNullableNumber,
        z.number().min(0).nullable().optional()
    ),
});

const cancelScheduleSchema = z.object({
    scheduleId: z.string().cuid(),
});

const listChangeRequestsSchema = z.object({
    productId: z.string().cuid(),
});

const resolveChangeRequestSchema = z.object({
    requestId: z.string().cuid(),
});

export const listProductPriceSchedules = createServerFn({ method: "GET" })
    .inputValidator(listSchedulesSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_DETAIL)) {
            throw new Error(
                "You do not have permission to view price schedules."
            );
        }

        return await prisma.productPriceSchedule.findMany({
            orderBy: [{ effectiveAt: "asc" }],
            where: {
                productId: data.productId,
            },
        });
    });

export const createProductPriceSchedule = createServerFn({ method: "POST" })
    .inputValidator(createScheduleSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EDIT_PRICING)) {
            throw new Error("You do not have permission to schedule prices.");
        }

        if (data.effectiveAt <= new Date()) {
            throw new Error("Schedule effective date must be in the future.");
        }

        const schedule = await prisma.productPriceSchedule.create({
            data: {
                costPrice: data.costPrice,
                createdById: context.session.user.id,
                effectiveAt: data.effectiveAt,
                productId: data.productId,
                reason: data.reason,
                sellingPrice: data.sellingPrice,
            },
        });

        await logActivity({
            action: "PRODUCT_PRICE_SCHEDULE_CREATED",
            actorUserId: context.session.user.id,
            changes: {
                productId: data.productId,
                scheduleId: schedule.id,
            },
            entity: "Product",
            entityId: data.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return schedule;
    });

export const cancelProductPriceSchedule = createServerFn({ method: "POST" })
    .inputValidator(cancelScheduleSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_EDIT_PRICING)) {
            throw new Error(
                "You do not have permission to cancel price schedules."
            );
        }

        const schedule = await prisma.productPriceSchedule.update({
            data: {
                status: "CANCELED",
            },
            where: {
                id: data.scheduleId,
            },
        });

        await logActivity({
            action: "PRODUCT_PRICE_SCHEDULE_CANCELED",
            actorUserId: context.session.user.id,
            changes: {
                productId: schedule.productId,
                scheduleId: schedule.id,
            },
            entity: "Product",
            entityId: schedule.productId,
            ipAddress: getRequestIpAddress(getRequestHeaders()),
        });

        return schedule;
    });

export const applyDueProductPriceSchedules = createServerFn({ method: "POST" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (!isApproverRole(context.session.user.role)) {
            throw new Error("Only admins can apply scheduled prices.");
        }

        const now = new Date();
        const dueSchedules = await prisma.productPriceSchedule.findMany({
            where: {
                effectiveAt: { lte: now },
                status: "PENDING",
            },
        });

        for (const schedule of dueSchedules) {
            const product = await prisma.product.update({
                data: {
                    costPrice:
                        schedule.costPrice === null
                            ? undefined
                            : schedule.costPrice,
                    sellingPrice:
                        schedule.sellingPrice === null
                            ? undefined
                            : schedule.sellingPrice,
                },
                where: {
                    id: schedule.productId,
                },
            });

            await prisma.productPriceHistory.create({
                data: {
                    changedById: context.session.user.id,
                    costPrice: product.costPrice,
                    productId: product.id,
                    reason: schedule.reason ?? "Scheduled price applied",
                    sellingPrice: product.sellingPrice,
                },
            });

            await prisma.productPriceSchedule.update({
                data: {
                    appliedAt: now,
                    status: "APPLIED",
                },
                where: {
                    id: schedule.id,
                },
            });
        }

        return {
            appliedCount: dueSchedules.length,
        };
    });

export const listProductChangeRequests = createServerFn({ method: "GET" })
    .inputValidator(listChangeRequestsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.PRODUCTS_VIEW_DETAIL)) {
            throw new Error(
                "You do not have permission to view change requests."
            );
        }

        return await prisma.productChangeRequest.findMany({
            orderBy: [{ createdAt: "desc" }],
            where: {
                productId: data.productId,
            },
        });
    });

export const approveProductChangeRequest = createServerFn({ method: "POST" })
    .inputValidator(resolveChangeRequestSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!isApproverRole(context.session.user.role)) {
            throw new Error("Only admins can approve change requests.");
        }

        const request = await prisma.productChangeRequest.findUnique({
            where: {
                id: data.requestId,
            },
        });
        if (!request) {
            throw new Error("Change request not found.");
        }
        if (request.status !== "PENDING") {
            throw new Error("Only pending requests can be approved.");
        }

        const payload =
            typeof request.payload === "object" && request.payload
                ? (request.payload as Record<string, unknown>)
                : {};
        const nextStatus = parseProductStatus(payload.status);

        const product = await prisma.product.update({
            data: {
                ...(typeof payload.costPrice === "number"
                    ? { costPrice: Math.round(payload.costPrice) }
                    : {}),
                ...(typeof payload.sellingPrice === "number"
                    ? { sellingPrice: Math.round(payload.sellingPrice) }
                    : {}),
                ...(typeof payload.taxRate === "number"
                    ? { taxRate: Math.round(payload.taxRate) }
                    : {}),
                ...(nextStatus
                    ? {
                          deletedAt:
                              nextStatus === "ARCHIVED" ? new Date() : null,
                          isActive: nextStatus === "ACTIVE",
                          status: nextStatus,
                      }
                    : {}),
                ...(typeof payload.trackByBatch === "boolean"
                    ? { trackByBatch: payload.trackByBatch }
                    : {}),
                ...(typeof payload.trackByExpiry === "boolean"
                    ? { trackByExpiry: payload.trackByExpiry }
                    : {}),
                ...(typeof payload.trackBySerialNumber === "boolean"
                    ? { trackBySerialNumber: payload.trackBySerialNumber }
                    : {}),
            },
            where: {
                id: request.productId,
            },
        });

        if (
            typeof payload.costPrice === "number" ||
            typeof payload.sellingPrice === "number"
        ) {
            await prisma.productPriceHistory.create({
                data: {
                    changedById: context.session.user.id,
                    costPrice: product.costPrice,
                    productId: product.id,
                    reason: "Approved change request",
                    sellingPrice: product.sellingPrice,
                },
            });
        }

        await prisma.productChangeRequest.update({
            data: {
                approvedById: context.session.user.id,
                resolvedAt: new Date(),
                status: "APPROVED",
            },
            where: {
                id: request.id,
            },
        });

        return { success: true };
    });

export const rejectProductChangeRequest = createServerFn({ method: "POST" })
    .inputValidator(resolveChangeRequestSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!isApproverRole(context.session.user.role)) {
            throw new Error("Only admins can reject change requests.");
        }

        await prisma.productChangeRequest.update({
            data: {
                approvedById: context.session.user.id,
                resolvedAt: new Date(),
                status: "REJECTED",
            },
            where: {
                id: data.requestId,
            },
        });

        return { success: true };
    });
