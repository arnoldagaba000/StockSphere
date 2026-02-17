import { redirect } from "@tanstack/react-router";
import { createMiddleware, createStart } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "./lib/auth";

const globalAuthMiddleware = createMiddleware({ type: "request" }).server(
    async ({ next }) => {
        const headers = getRequestHeaders();

        const session = await auth.api.getSession({ headers });
        if (!session?.user) {
            throw redirect({
                to: "/login",
                search: { redirect: location.pathname + location.search },
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
