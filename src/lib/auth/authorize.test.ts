import { describe, expect, test } from "bun:test";
import { canUser, isAppUserRole } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";

describe("isAppUserRole", () => {
    test("accepts valid app roles", () => {
        expect(isAppUserRole("VIEWER")).toBe(true);
        expect(isAppUserRole("STAFF")).toBe(true);
        expect(isAppUserRole("MANAGER")).toBe(true);
        expect(isAppUserRole("ADMIN")).toBe(true);
        expect(isAppUserRole("SUPER_ADMIN")).toBe(true);
    });

    test("rejects invalid role values", () => {
        expect(isAppUserRole("")).toBe(false);
        expect(isAppUserRole("viewer")).toBe(false);
        expect(isAppUserRole("ROOT")).toBe(false);
    });
});

describe("canUser", () => {
    test("denies access when account is explicitly inactive", () => {
        const isAllowed = canUser(
            {
                isActive: false,
                role: "SUPER_ADMIN",
            },
            PERMISSIONS.SETTINGS_DB_MIGRATIONS_RUN
        );

        expect(isAllowed).toBe(false);
    });

    test("denies access when role is missing or invalid", () => {
        expect(
            canUser({ isActive: true, role: null }, PERMISSIONS.AUTH_LOGIN)
        ).toBe(false);
        expect(
            canUser({ isActive: true, role: "OWNER" }, PERMISSIONS.AUTH_LOGIN)
        ).toBe(false);
    });

    test("allows baseline permissions for viewer role", () => {
        const isAllowed = canUser(
            {
                isActive: true,
                role: "VIEWER",
            },
            PERMISSIONS.AUTH_LOGIN
        );

        expect(isAllowed).toBe(true);
    });

    test("enforces super-admin-only permissions", () => {
        const adminCanAssignSuperAdmin = canUser(
            {
                isActive: true,
                role: "ADMIN",
            },
            PERMISSIONS.USERS_ASSIGN_SUPER_ADMIN
        );
        const superAdminCanAssignSuperAdmin = canUser(
            {
                isActive: true,
                role: "SUPER_ADMIN",
            },
            PERMISSIONS.USERS_ASSIGN_SUPER_ADMIN
        );

        expect(adminCanAssignSuperAdmin).toBe(false);
        expect(superAdminCanAssignSuperAdmin).toBe(true);
    });
});
