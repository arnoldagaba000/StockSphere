import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
import { auth } from "@/lib/auth/config";
import { type AppUserRole, USER_ROLES } from "@/lib/auth/roles";
import { authMiddleware } from "@/middleware/auth";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

interface RolePayload {
    role: AppUserRole;
    userId: string;
}

interface UserPayload {
    userId: string;
}

const parseAppRole = (value: unknown): AppUserRole | undefined => {
    if (typeof value !== "string") {
        return undefined;
    }

    const [firstRole] = value.split(",");
    const normalizedRole = firstRole?.trim();
    if (!normalizedRole) {
        return undefined;
    }

    if (!USER_ROLES.includes(normalizedRole as AppUserRole)) {
        return undefined;
    }

    return normalizedRole as AppUserRole;
};

const isAdminRole = (role: string | null | undefined): role is AppUserRole =>
    typeof role === "string" &&
    ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number]);

const assertAdminActor = (role: string | null | undefined): AppUserRole => {
    if (!isAdminRole(role)) {
        throw new Error("Only admins can manage users.");
    }

    return role;
};

const assertCanManageTarget = (
    actorRole: AppUserRole,
    targetRole: AppUserRole | undefined
): void => {
    if (actorRole !== "SUPER_ADMIN" && targetRole === "SUPER_ADMIN") {
        throw new Error("Admins cannot manage super admin accounts.");
    }
};

const getActorRole = (
    context: {
        session?: {
            user?: {
                role?: string | null;
            };
        };
    } | null
): AppUserRole => {
    const role = context?.session?.user?.role;
    return assertAdminActor(role);
};

const getTargetUser = (userId: string) => {
    const headers = getRequestHeaders();
    return auth.api.getUser({
        headers,
        query: { id: userId },
    });
};

const assertNotLastSuperAdmin = async (
    targetUserId: string,
    targetRole: AppUserRole | undefined
): Promise<void> => {
    if (targetRole !== "SUPER_ADMIN") {
        return;
    }

    const superAdminCount = await prisma.user.count({
        where: {
            role: "SUPER_ADMIN",
        },
    });

    if (superAdminCount <= 1) {
        throw new Error(
            "Cannot perform this action on the last remaining super admin."
        );
    }

    const targetUser = await prisma.user.findUnique({
        where: {
            id: targetUserId,
        },
        select: {
            role: true,
        },
    });

    if (targetUser?.role !== "SUPER_ADMIN") {
        return;
    }
};

export const listManagedUsers = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(({ context }) => {
        getActorRole(context);

        const headers = getRequestHeaders();
        return auth.api.listUsers({
            headers,
            query: {
                limit: 100,
                offset: 0,
                sortBy: "createdAt",
                sortDirection: "desc",
            },
        });
    });

export const updateManagedUserRole = createServerFn({ method: "POST" })
    .inputValidator((data: RolePayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const actorRole = getActorRole(context);

        if (actorRole !== "SUPER_ADMIN" && data.role === "SUPER_ADMIN") {
            throw new Error(
                "Only super admins can assign the super admin role."
            );
        }

        const targetUser = await getTargetUser(data.userId);
        const targetRole = parseAppRole(targetUser.role);
        assertCanManageTarget(actorRole, targetRole);
        if (targetRole === "SUPER_ADMIN" && data.role !== "SUPER_ADMIN") {
            await assertNotLastSuperAdmin(data.userId, targetRole);
        }

        const headers = getRequestHeaders();
        const response = await auth.api.setRole({
            body: {
                role: data.role,
                userId: data.userId,
            },
            headers,
        });

        await logActivity({
            action: "USER_ROLE_UPDATED",
            actorUserId: context.session.user.id,
            changes: {
                fromRole: targetRole ?? null,
                toRole: data.role,
                userId: data.userId,
            },
            entity: "User",
            entityId: data.userId,
            ipAddress: getRequestIpAddress(headers),
        });

        return response;
    });

export const banManagedUser = createServerFn({ method: "POST" })
    .inputValidator((data: UserPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const actorRole = getActorRole(context);
        const targetUser = await getTargetUser(data.userId);
        const targetRole = parseAppRole(targetUser.role);
        assertCanManageTarget(actorRole, targetRole);

        const headers = getRequestHeaders();
        const response = await auth.api.banUser({
            body: {
                userId: data.userId,
            },
            headers,
        });

        await logActivity({
            action: "USER_BANNED",
            actorUserId: context.session.user.id,
            changes: {
                userId: data.userId,
            },
            entity: "User",
            entityId: data.userId,
            ipAddress: getRequestIpAddress(headers),
        });

        return response;
    });

export const unbanManagedUser = createServerFn({ method: "POST" })
    .inputValidator((data: UserPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const actorRole = getActorRole(context);
        const targetUser = await getTargetUser(data.userId);
        const targetRole = parseAppRole(targetUser.role);
        assertCanManageTarget(actorRole, targetRole);

        const headers = getRequestHeaders();
        const response = await auth.api.unbanUser({
            body: {
                userId: data.userId,
            },
            headers,
        });

        await logActivity({
            action: "USER_UNBANNED",
            actorUserId: context.session.user.id,
            changes: {
                userId: data.userId,
            },
            entity: "User",
            entityId: data.userId,
            ipAddress: getRequestIpAddress(headers),
        });

        return response;
    });

export const revokeManagedUserSessions = createServerFn({ method: "POST" })
    .inputValidator((data: UserPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const actorRole = getActorRole(context);
        const targetUser = await getTargetUser(data.userId);
        const targetRole = parseAppRole(targetUser.role);
        assertCanManageTarget(actorRole, targetRole);

        const headers = getRequestHeaders();
        const response = await auth.api.revokeUserSessions({
            body: {
                userId: data.userId,
            },
            headers,
        });

        await logActivity({
            action: "USER_SESSIONS_REVOKED",
            actorUserId: context.session.user.id,
            changes: {
                userId: data.userId,
            },
            entity: "User",
            entityId: data.userId,
            ipAddress: getRequestIpAddress(headers),
        });

        return response;
    });

export const removeManagedUser = createServerFn({ method: "POST" })
    .inputValidator((data: UserPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const actorRole = getActorRole(context);
        const targetUser = await getTargetUser(data.userId);
        const targetRole = parseAppRole(targetUser.role);
        assertCanManageTarget(actorRole, targetRole);
        await assertNotLastSuperAdmin(data.userId, targetRole);

        const headers = getRequestHeaders();
        const response = await auth.api.removeUser({
            body: {
                userId: data.userId,
            },
            headers,
        });

        await logActivity({
            action: "USER_DELETED",
            actorUserId: context.session.user.id,
            changes: {
                userId: data.userId,
            },
            entity: "User",
            entityId: data.userId,
            ipAddress: getRequestIpAddress(headers),
        });

        return response;
    });

export const impersonateManagedUser = createServerFn({ method: "POST" })
    .inputValidator((data: UserPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const actorRole = getActorRole(context);
        if (actorRole !== "SUPER_ADMIN") {
            throw new Error("Only super admins can impersonate users.");
        }

        const headers = getRequestHeaders();
        const response = await auth.api.impersonateUser({
            body: {
                userId: data.userId,
            },
            headers,
        });

        await logActivity({
            action: "USER_IMPERSONATION_STARTED",
            actorUserId: context.session.user.id,
            changes: {
                userId: data.userId,
            },
            entity: "User",
            entityId: data.userId,
            ipAddress: getRequestIpAddress(headers),
        });

        return response;
    });
