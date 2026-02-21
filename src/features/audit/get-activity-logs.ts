import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getActivityLogsInputSchema = z.object({
    action: z.string().trim().min(1).max(80).optional(),
    entity: z.string().trim().min(1).max(80).optional(),
    limit: z.number().int().min(1).max(200).optional().default(100),
    userId: z.string().trim().min(1).optional(),
});

export const getActivityLogs = createServerFn({ method: "GET" })
    .inputValidator(getActivityLogsInputSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const canViewOwn = canUser(
            context.session.user,
            PERMISSIONS.AUDIT_LOG_VIEW_OWN
        );
        const canViewAll = canUser(
            context.session.user,
            PERMISSIONS.AUDIT_LOG_VIEW_ALL
        );
        const canFilterByEntity = canUser(
            context.session.user,
            PERMISSIONS.AUDIT_LOG_FILTER_BY_ENTITY
        );
        const canFilterByUser = canUser(
            context.session.user,
            PERMISSIONS.AUDIT_LOG_FILTER_BY_USER
        );
        const canExport = canUser(
            context.session.user,
            PERMISSIONS.AUDIT_LOG_EXPORT
        );

        if (!canViewOwn) {
            throw new Error(
                "You do not have permission to view activity logs."
            );
        }

        if (data.entity && !canFilterByEntity) {
            throw new Error(
                "You do not have permission to filter logs by entity."
            );
        }

        const requestedUserId = data.userId?.trim();
        if (requestedUserId && !canFilterByUser) {
            throw new Error(
                "You do not have permission to filter logs by user."
            );
        }

        const effectiveUserId = canViewAll
            ? requestedUserId
            : context.session.user.id;

        const logs = await prisma.activityLog.findMany({
            include: {
                user: {
                    select: {
                        email: true,
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
            orderBy: [{ createdAt: "desc" }],
            take: data.limit,
            where: {
                ...(data.action
                    ? {
                          action: {
                              contains: data.action,
                              mode: "insensitive",
                          },
                      }
                    : {}),
                ...(data.entity
                    ? {
                          entity: {
                              contains: data.entity,
                              mode: "insensitive",
                          },
                      }
                    : {}),
                ...(effectiveUserId ? { userId: effectiveUserId } : {}),
            },
        });

        return {
            capabilities: {
                canExport,
                canFilterByEntity,
                canFilterByUser,
                canViewAll,
                canViewOwn,
            },
            logs,
        };
    });
