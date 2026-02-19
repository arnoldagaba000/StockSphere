import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/categories")({
    component: CategoriesRouteLayout,
});

function CategoriesRouteLayout() {
    return <Outlet />;
}
