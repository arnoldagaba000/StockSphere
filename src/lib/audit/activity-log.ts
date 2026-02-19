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

const parseTrustedProxyHops = (): number => {
    const rawValue = process.env.TRUSTED_PROXY_HOPS;
    if (!rawValue) {
        return 0;
    }

    const parsedValue = Number.parseInt(rawValue, 10);
    if (!Number.isFinite(parsedValue) || parsedValue < 0) {
        return 0;
    }

    return parsedValue;
};

export const logActivity = async ({
    action,
    actorUserId,
    changes,
    entity,
    entityId,
    ipAddress,
}: LogActivityInput): Promise<void> => {
    try {
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
    } catch (error) {
        // Audit failures should not block primary user flows.
        console.error("Failed to persist audit activity log", {
            action,
            actorUserId,
            entity,
            entityId,
            error,
        });
    }
};

export const getRequestIpAddress = (headers: Headers): string | null => {
    const trustedProxyHops = parseTrustedProxyHops();
    if (trustedProxyHops <= 0) {
        // Do not trust proxy headers unless explicitly configured.
        return null;
    }

    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) {
        const forwardedIps = forwardedFor
            .split(",")
            .map((value) => value.trim())
            .filter((value) => value.length > 0);

        const trustedIndex = forwardedIps.length - trustedProxyHops;
        if (trustedIndex >= 0 && trustedIndex < forwardedIps.length) {
            return forwardedIps[trustedIndex] ?? null;
        }
    }

    // Fallback for single-proxy setups that set X-Real-IP.
    const realIp = headers.get("x-real-ip");
    if (realIp) {
        return realIp.trim();
    }

    return null;
};
