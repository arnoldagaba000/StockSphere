import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { prisma } from "@/db";
import { canUser } from "@/lib/auth/authorize";
import { PERMISSIONS } from "@/lib/auth/permissions";
import { authMiddleware } from "@/middleware/auth";

const getLocationSchema = z.object({
    id: z.string().min(1),
});

export const getLocation = createServerFn({ method: "GET" })
    .inputValidator(getLocationSchema)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        if (!canUser(context.session.user, PERMISSIONS.LOCATIONS_VIEW)) {
            throw new Error("You do not have permission to view locations.");
        }

        const location = await prisma.location.findFirst({
            where: {
                id: data.id,
            },
            include: {
                _count: {
                    select: {
                        goodsReceiptItems: true,
                        stockItems: true,
                    },
                },
                warehouse: {
                    select: {
                        code: true,
                        id: true,
                        name: true,
                    },
                },
            },
        });

        if (!location) {
            throw new Error("Location not found.");
        }

        return location;
    });
