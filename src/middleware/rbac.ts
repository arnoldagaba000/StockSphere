import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { canUser } from "@/lib/auth/authorize";
import type { AppPermission } from "@/lib/auth/permissions";
import type { AppUserRole } from "@/lib/auth/roles";

interface SessionContext {
    session?: {
        user?: {
            isActive?: boolean | null;
            role?: string | null;
        };
    };
}

/**
 * Restrict access to a fixed list of roles.
 * Use after `authMiddleware` so `context.session.user` is available.
 */
export const requireRole = (roles: readonly AppUserRole[]) =>
    createMiddleware().server(({ context, next }) => {
        const user = (context as unknown as SessionContext).session?.user;

        if (!user?.role) {
            throw redirect({ to: "/login" });
        }

        if (!roles.includes(user.role as AppUserRole)) {
            throw redirect({ to: "/" });
        }

        return next();
    });

/**
 * Restrict access to a specific permission.
 * Uses the central ROLE_PERMISSIONS map via `canUser`.
 */
export const requirePermission = (permission: AppPermission) =>
    createMiddleware().server(({ context, next }) => {
        const user = (context as unknown as SessionContext).session?.user;

        if (!user) {
            throw redirect({ to: "/login" });
        }

        if (!canUser(user, permission)) {
            throw redirect({ to: "/" });
        }

        return next();
    });
