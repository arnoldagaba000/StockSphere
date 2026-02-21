import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import {
    ActivityIcon,
    ShieldCheckIcon,
    SlidersHorizontalIcon,
    UserCogIcon,
    UserIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
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
    const roleLabel = user.role
        ? user.role
              .toLowerCase()
              .split("_")
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" ")
        : "Viewer";

    return (
        <section className="w-full space-y-5">
            <Card className="border border-border/70 bg-linear-to-br from-card via-card to-primary/8 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <h1 className="font-semibold text-2xl">Settings</h1>
                            <Badge variant="secondary">Control Center</Badge>
                        </div>
                        <p className="text-foreground/80 text-sm">
                            Configure account preferences, security posture, and
                            administrative controls.
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                            <UserIcon className="mr-1 h-3.5 w-3.5" />
                            {roleLabel}
                        </Badge>
                        <Badge variant={isAdmin ? "secondary" : "outline"}>
                            <ShieldCheckIcon className="mr-1 h-3.5 w-3.5" />
                            {isAdmin ? "Admin Access" : "User Access"}
                        </Badge>
                    </div>
                </div>
            </Card>

            <nav className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                <Link
                    activeProps={{
                        className:
                            "bg-primary text-primary-foreground border-primary",
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                    to="/settings/profile"
                >
                    <UserCogIcon className="h-4 w-4" />
                    Profile Settings
                </Link>
                {isAdmin ? (
                    <Link
                        activeProps={{
                            className:
                                "bg-primary text-primary-foreground border-primary",
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                        to="/settings/system"
                    >
                        <SlidersHorizontalIcon className="h-4 w-4" />
                        System
                    </Link>
                ) : null}
                <Link
                    activeProps={{
                        className:
                            "bg-primary text-primary-foreground border-primary",
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                    to="/settings/security"
                >
                    <ShieldCheckIcon className="h-4 w-4" />
                    Security
                </Link>
                {isAdmin ? (
                    <Link
                        activeProps={{
                            className:
                                "bg-primary text-primary-foreground border-primary",
                        }}
                        className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                        to="/settings/user-management"
                    >
                        <UserIcon className="h-4 w-4" />
                        User Management
                    </Link>
                ) : null}
                <Link
                    activeProps={{
                        className:
                            "bg-primary text-primary-foreground border-primary",
                    }}
                    className="inline-flex items-center gap-2 rounded-md border border-border/70 bg-card/70 px-3 py-2 text-sm transition-colors hover:bg-muted/60"
                    to="/settings/audit"
                >
                    <ActivityIcon className="h-4 w-4" />
                    Audit Trail
                </Link>
            </nav>

            <Outlet />
        </section>
    );
}
