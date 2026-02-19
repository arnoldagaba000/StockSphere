import { prisma } from "@/db";
import type { Prisma } from "@/generated/prisma/client";

interface LogActivityInput {
    action: string;
    actorUserId: string;
    changes?: Prisma.InputJsonValue;
    entity: string;
    entityId: string;
    ipAddress?: string | null;
}

const resolveIpAddress = (
    ipAddress: string | null | undefined
): string | null => ipAddress?.trim() || null;

export const logActivity = async ({
    action,
    actorUserId,
    changes,
    entity,
    entityId,
    ipAddress,
}: LogActivityInput): Promise<void> => {
    await prisma.activityLog.create({
        data: {
            action,
            changes: changes ? changes : undefined,
            entity,
            entityId,
            ipAddress: resolveIpAddress(ipAddress),
            userId: actorUserId,
        },
    });
};

export const getRequestIpAddress = (headers: Headers): string | null => {
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
        const [firstIp] = forwardedFor.split(",");
        if (firstIp) {
            return firstIp.trim();
        }
    }

    const realIp = headers.get("x-real-ip");
    if (realIp) {
        return realIp.trim();
    }

    return null;
};
