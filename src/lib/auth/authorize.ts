import type { AppPermission } from "./permissions";
import { ROLE_PERMISSIONS } from "./permissions";
import type { AppUserRole } from "./roles";
import { USER_ROLES } from "./roles";

interface AuthorizationUser {
    isActive?: boolean | null;
    role?: string | null;
}

/**
 * Type guard for validating untrusted role values at runtime.
 */
export const isAppUserRole = (role: string): role is AppUserRole =>
    USER_ROLES.includes(role as AppUserRole);

/**
 * Returns true when a user has permission to perform an action.
 */
export const canUser = (
    user: AuthorizationUser,
    permission: AppPermission
): boolean => {
    // Treat only explicit false as inactive to avoid rejecting users when
    // auth session payload omits `isActive`.
    if (user.isActive === false) {
        return false;
    }

    if (!(user.role && isAppUserRole(user.role))) {
        return false;
    }

    return ROLE_PERMISSIONS[user.role].includes(permission);
};
