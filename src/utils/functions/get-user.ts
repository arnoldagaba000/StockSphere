import { createServerFn } from "@tanstack/react-start";
import { authMiddleware } from "@/middleware/auth";

export const getUser = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(({ context }) => {
        const { user } = context.session;

        return { user };
    });

export const getSession = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(({ context }) => {
        const { session } = context.session;

        return { session };
    });
