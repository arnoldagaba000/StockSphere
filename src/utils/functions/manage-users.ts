import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
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

const assertSuperAdminActor = (role: AppUserRole): void => {
    if (role !== "SUPER_ADMIN") {
        throw new Error("Only super admins can perform this action.");
    }
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

        const headers = getRequestHeaders();
        return auth.api.setRole({
            body: {
                role: data.role,
                userId: data.userId,
            },
            headers,
        });
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
        return auth.api.banUser({
            body: {
                userId: data.userId,
            },
            headers,
        });
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
        return auth.api.unbanUser({
            body: {
                userId: data.userId,
            },
            headers,
        });
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
        return auth.api.revokeUserSessions({
            body: {
                userId: data.userId,
            },
            headers,
        });
    });

export const removeManagedUser = createServerFn({ method: "POST" })
    .inputValidator((data: UserPayload) => data)
    .middleware([authMiddleware])
    .handler(({ context, data }) => {
        const actorRole = getActorRole(context);
        assertSuperAdminActor(actorRole);

        const headers = getRequestHeaders();
        return auth.api.removeUser({
            body: {
                userId: data.userId,
            },
            headers,
        });
    });
