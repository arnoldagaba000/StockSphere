import { prisma } from "@/db";
import { getSuperAdminEmail } from "./roles";

let ensureSuperAdminPromise: Promise<void> | undefined;

/**
 * Ensures that the configured developer email has `SUPER_ADMIN` role.
 * This runs lazily and at most once per server process.
 */
export const ensureSuperAdminRole = (): Promise<void> => {
    if (ensureSuperAdminPromise) {
        return ensureSuperAdminPromise;
    }

    ensureSuperAdminPromise = (async () => {
        const superAdminEmail = getSuperAdminEmail();
        if (!superAdminEmail) {
            return;
        }

        await prisma.user.updateMany({
            where: {
                email: {
                    equals: superAdminEmail,
                    mode: "insensitive",
                },
            },
            data: {
                role: "SUPER_ADMIN",
            },
        });
    })();

    return ensureSuperAdminPromise;
};
