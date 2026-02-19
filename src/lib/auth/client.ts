import {
    adminClient,
    inferAdditionalFields,
    lastLoginMethodClient,
} from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import { adminAccessControl, betterAuthAdminRoles } from "./admin-access";
import type { auth } from "./config";

/**
 * Browser auth client used by auth forms and logout flows.
 */
export const authClient = createAuthClient({
    plugins: [
        inferAdditionalFields<typeof auth>(),
        adminClient({
            ac: adminAccessControl,
            roles: betterAuthAdminRoles,
        }),
        lastLoginMethodClient(),
    ],
});
