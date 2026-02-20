import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { mapSystemSettings } from "@/features/settings/system-settings-helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const canViewSystemSettings = (user: {
    isActive?: boolean | null;
    role?: string | null;
}) =>
    canUser(user, PERMISSIONS.SETTINGS_COMPANY_VIEW) ||
    canUser(user, PERMISSIONS.SETTINGS_CURRENCY_SET_DEFAULT) ||
    canUser(user, PERMISSIONS.SETTINGS_NUMBERING_SEQUENCES_CONFIGURE) ||
    canUser(user, PERMISSIONS.SETTINGS_FISCAL_YEAR_CONFIGURE) ||
    canUser(user, PERMISSIONS.SETTINGS_EMAIL_NOTIFICATIONS_CONFIGURE);

export const getSystemSettings = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (!canViewSystemSettings(context.session.user)) {
            throw new Error(
                "You do not have permission to view system settings."
            );
        }

        const settings = await prisma.systemSetting.findMany({
            select: {
                key: true,
                value: true,
            },
        });

        return mapSystemSettings(settings);
    });
