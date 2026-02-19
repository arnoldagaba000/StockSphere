/**
 * Canonical role names used across the IMS application.
 * Keep this list aligned with `UserRole` in `prisma/schema.prisma`.
 */
export const USER_ROLES = [
    "SUPER_ADMIN",
    "ADMIN",
    "MANAGER",
    "STAFF",
    "VIEWER",
] as const;

export type AppUserRole = (typeof USER_ROLES)[number];

/**
 * Default role for non-privileged users.
 */
export const DEFAULT_USER_ROLE: AppUserRole = "STAFF";

/**
 * Resolve the configured developer email that should always be SUPER_ADMIN.
 */
export const getSuperAdminEmail = (): string | undefined => {
    const configuredEmail = process.env.SUPER_ADMIN_EMAIL?.trim();
    if (!configuredEmail) {
        return undefined;
    }

    return configuredEmail.toLowerCase();
};

/**
 * Returns true when an email belongs to the configured developer super admin.
 */
export const isSuperAdminEmail = (
    email: string | null | undefined
): boolean => {
    if (!email) {
        return false;
    }

    const superAdminEmail = getSuperAdminEmail();
    if (!superAdminEmail) {
        return false;
    }

    return email.toLowerCase() === superAdminEmail;
};
