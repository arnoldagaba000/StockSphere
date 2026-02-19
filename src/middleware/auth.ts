import { redirect } from "@tanstack/react-router";
import { createMiddleware } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { prisma } from "@/db";
import { auth } from "@/lib/auth/config";

export const authMiddleware = createMiddleware().server(
    async ({ next, request }) => {
        const url = new URL(request.url);
        const headers = getRequestHeaders();

        const session = await auth.api.getSession({ headers });
        if (!session?.user) {
            throw redirect({
                to: "/login",
                search: { redirectTo: url.pathname + url.search },
            });
        }

        const userRecord = await prisma.user.findUnique({
            select: { banReason: true, banned: true },
            where: { id: session.user.id },
        });
        if (userRecord?.banned) {
            throw redirect({
                to: "/banned",
                search: {
                    reason:
                        userRecord.banReason ??
                        "Your account is currently banned.",
                },
            });
        }

        return await next({ context: { session } });
    }
);
