import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { Badge } from "@/components/ui/badge";
import { getUser } from "@/utils/functions/get-user";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export const Route = createFileRoute("/_dashboard/settings")({
    component: SettingsLayout,
    loader: () => getUser(),
});

function SettingsLayout() {
    const { user } = Route.useLoaderData();
    const isAdmin =
        typeof user.role === "string" &&
        ADMIN_ROLES.includes(user.role as (typeof ADMIN_ROLES)[number]);

    return (
        <section className="w-full space-y-4">
            <div className="space-y-2">
                <div className="flex items-center gap-2">
                    <h1 className="font-semibold text-2xl">Settings</h1>
                    <Badge variant="secondary">Account</Badge>
                </div>
                <p className="text-muted-foreground text-sm">
                    Manage account preferences, security, and administrative
                    controls.
                </p>
            </div>

            <nav className="flex flex-wrap gap-2">
                <Link
                    activeProps={{
                        className: "bg-primary text-primary-foreground",
                    }}
                    className="rounded-md border px-3 py-1.5 text-sm"
                    to="/settings/profile"
                >
                    Profile Settings
                </Link>
                {isAdmin ? (
                    <Link
                        activeProps={{
                            className: "bg-primary text-primary-foreground",
                        }}
                        className="rounded-md border px-3 py-1.5 text-sm"
                        to="/settings/system"
                    >
                        System
                    </Link>
                ) : null}
                <Link
                    activeProps={{
                        className: "bg-primary text-primary-foreground",
                    }}
                    className="rounded-md border px-3 py-1.5 text-sm"
                    to="/settings/security"
                >
                    Security
                </Link>
                {isAdmin ? (
                    <Link
                        activeProps={{
                            className: "bg-primary text-primary-foreground",
                        }}
                        className="rounded-md border px-3 py-1.5 text-sm"
                        to="/settings/user-management"
                    >
                        User Management
                    </Link>
                ) : null}
                <Link
                    activeProps={{
                        className: "bg-primary text-primary-foreground",
                    }}
                    className="rounded-md border px-3 py-1.5 text-sm"
                    to="/settings/audit"
                >
                    Audit Trail
                </Link>
            </nav>

            <Outlet />
        </section>
    );
}
