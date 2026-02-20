import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/mobile/")({
    beforeLoad: () => {
        throw redirect({ to: "/mobile/receive" });
    },
});
