import { createAccessControl } from "better-auth/plugins/access";

export const adminAccessControl = createAccessControl({
    user: [
        "create",
        "list",
        "set-role",
        "ban",
        "impersonate",
        "delete",
        "set-password",
        "get",
        "update",
    ],
    session: ["list", "revoke", "delete"],
} as const);

export const betterAuthAdminRoles = {
    SUPER_ADMIN: adminAccessControl.newRole({
        user: [
            "create",
            "list",
            "set-role",
            "ban",
            "impersonate",
            "delete",
            "set-password",
            "get",
            "update",
        ],
        session: ["list", "revoke", "delete"],
    }),
    ADMIN: adminAccessControl.newRole({
        user: [
            "create",
            "list",
            "set-role",
            "ban",
            "delete",
            "set-password",
            "get",
            "update",
        ],
        session: ["list", "revoke", "delete"],
    }),
    MANAGER: adminAccessControl.newRole({
        user: ["list", "get"],
        session: ["list"],
    }),
    STAFF: adminAccessControl.newRole({
        user: [],
        session: [],
    }),
    VIEWER: adminAccessControl.newRole({
        user: [],
        session: [],
    }),
} as const;
