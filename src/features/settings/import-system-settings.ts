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

export const importSystemSettings = createServerFn({ method: "POST" })
    .inputValidator(systemSettingsSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (
            !canUser(
                context.session.user,
                PERMISSIONS.SETTINGS_BACKUP_IMPORT_RESTORE
            )
        ) {
            throw new Error(
                "You do not have permission to import system settings."
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
