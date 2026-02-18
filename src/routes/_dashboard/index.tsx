import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/")({
    component: HomePage,
});

function HomePage() {
    return <div>Hello "/dashboard/"!</div>;
}
