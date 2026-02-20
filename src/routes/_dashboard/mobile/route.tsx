import { createFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_dashboard/mobile")({
    component: MobileLayout,
});

function MobileLayout() {
    return (
        <section className="w-full space-y-4">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl">Mobile Operations</h1>
                <p className="text-muted-foreground text-sm">
                    Touch-first workflows for receiving, picking, and transfers.
                </p>
            </div>

            <nav className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
                <MobileNavLink label="Receive" to="/mobile/receive" />
                <MobileNavLink label="Pick" to="/mobile/pick" />
                <MobileNavLink label="Transfer" to="/mobile/transfer" />
            </nav>

            <Outlet />
        </section>
    );
}

function MobileNavLink({ label, to }: { label: string; to: string }) {
    return (
        <Link
            activeProps={{ className: "bg-primary text-primary-foreground" }}
            className="rounded-md border px-3 py-2 text-center text-sm"
            to={to}
        >
            {label}
        </Link>
    );
}
