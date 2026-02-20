import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import {
    mapSystemSettings,
    toSettingRows,
} from "@/features/settings/system-settings-helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";
import { systemSettingsSchema } from "@/schemas/system-settings-schema";

const canEditSystemSettings = (user: {
    isActive?: boolean | null;
    role?: string | null;
}) =>
    canUser(user, PERMISSIONS.SETTINGS_COMPANY_EDIT) &&
    canUser(user, PERMISSIONS.SETTINGS_CURRENCY_SET_DEFAULT) &&
    canUser(user, PERMISSIONS.SETTINGS_NUMBERING_SEQUENCES_CONFIGURE) &&
    canUser(user, PERMISSIONS.SETTINGS_FISCAL_YEAR_CONFIGURE) &&
    canUser(user, PERMISSIONS.SETTINGS_EMAIL_NOTIFICATIONS_CONFIGURE);

export const upsertSystemSettings = createServerFn({ method: "POST" })
    .inputValidator(systemSettingsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canEditSystemSettings(context.session.user)) {
            throw new Error(
                "You do not have permission to update system settings."
            );
        }

        const settingRows = toSettingRows(data);

        await prisma.$transaction(
            settingRows.map((setting) =>
                prisma.systemSetting.upsert({
                    create: {
                        description: setting.description,
                        key: setting.key,
                        value: setting.value,
                    },
                    update: {
                        description: setting.description,
                        value: setting.value,
                    },
                    where: {
                        key: setting.key,
                    },
                })
            )
        );

        const allSettings = await prisma.systemSetting.findMany({
            select: {
                key: true,
                value: true,
            },
        });

        return mapSystemSettings(allSettings);
    });
