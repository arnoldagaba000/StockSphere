import { createServerFn } from "@tanstack/react-start";
import { prisma } from "@/db";
import { mapSystemSettings } from "@/features/settings/system-settings-helpers";
import { authMiddleware } from "@/middleware/auth";

export const getFinancialSettings = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async () => {
        const settings = await prisma.systemSetting.findMany({
            select: {
                key: true,
                value: true,
            },
        });

        return mapSystemSettings(settings).financial;
    });
