import { createRouter as createTanStackRouter } from "@tanstack/react-router";
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query";
import NotFound from "@/components/features/not-found";
import { getContext } from "./integrations/react-query";

import { routeTree } from "./routeTree.gen";

export function getRouter() {
    const rqContext = getContext();

    const router = createTanStackRouter({
        routeTree,
        context: { ...rqContext },

        scrollRestoration: true,
        defaultPreload: "intent",
        defaultPreloadStaleTime: 0,
        defaultNotFoundComponent: () => <NotFound />,
        notFoundMode: "root",
    });

    setupRouterSsrQueryIntegration({
        router,
        queryClient: rqContext.queryClient,
    });

    return router;
}

declare module "@tanstack/react-router" {
    interface Register {
        router: ReturnType<typeof getRouter>;
    }
}
