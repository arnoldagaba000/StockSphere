import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { mapSystemSettings } from "@/features/settings/system-settings-helpers";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

export const exportSystemSettings = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        if (
            !canUser(context.session.user, PERMISSIONS.SETTINGS_BACKUP_EXPORT)
        ) {
            throw new Error(
                "You do not have permission to export system settings."
            );
        }

        const rows = await prisma.systemSetting.findMany({
            select: {
                key: true,
                value: true,
            },
        });
        const settings = mapSystemSettings(rows);

        const timestamp = new Date()
            .toISOString()
            .replaceAll(":", "")
            .replaceAll("-", "")
            .replace(".", "")
            .replace("T", "-")
            .replace("Z", "")
            .slice(0, 15);

        return {
            filename: `system-settings-${timestamp}.json`,
            json: JSON.stringify(settings, null, 2),
        };
    });
