import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/products")({
    component: ProductsRouteLayout,
});

function ProductsRouteLayout() {
    return <Outlet />;
}
