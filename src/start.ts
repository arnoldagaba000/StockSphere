import { redirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./lib/auth";

const globalAuthMiddleware = createMiddleware({ type: "request" }).server(
    async ({ next, request }) => {
        const url = new URL(request.url);
        const pathname = url.pathname;

        // Exclude auth pages and auth API
        if (
            pathname.startsWith("/login") ||
            pathname.startsWith("/register") ||
            pathname.startsWith("/api/auth")
        ) {
            return next();
        }

        const headers = getRequestHeaders();

        const session = await auth.api.getSession({ headers });
        if (!session?.user) {
            throw redirect({
                to: "/login",
                search: { redirectTo: url.pathname + url.search },
            });
        }

        return next();
    }
);

export const startInstance = createStart(() => {
    return {
        requestMiddleware: [globalAuthMiddleware],
    };
});
