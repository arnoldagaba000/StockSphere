import { createFileRoute, Link } from "@tanstack/react-router";
import { MailIcon, ShieldCheckIcon, UserIcon } from "lucide-react";
import UserAvatar from "@/components/layout/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getUser } from "@/utils/functions/get-user";

export const Route = createFileRoute("/_dashboard/profile")({
    component: ProfilePage,
    loader: () => getUser(),
});

const formatRole = (role: string | null | undefined): string => {
    if (!role) {
        return "Viewer";
    }

    return role
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

function ProfilePage() {
    const { user } = Route.useLoaderData();

    return (
        <section className="w-full max-w-4xl space-y-5">
            <Card className="border border-border/70 bg-linear-to-br from-card via-card to-primary/8 p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <UserAvatar size="lg" user={user} />
                        <div className="space-y-1">
                            <h1 className="font-semibold text-2xl">
                                {user.name}
                            </h1>
                            <p className="text-foreground/80 text-sm">
                                {user.email}
                            </p>
                            <Badge variant="secondary">
                                {formatRole(user.role)}
                            </Badge>
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            nativeButton={false}
                            render={<Link to="/settings/profile" />}
                            variant="outline"
                        >
                            Edit Profile
                        </Button>
                        <Button
                            nativeButton={false}
                            render={<Link to="/settings/security" />}
                            variant="outline"
                        >
                            Security
                        </Button>
                    </div>
                </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
                <Card className="border border-border/70">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <UserIcon className="h-4 w-4 text-primary" />
                            Account Identity
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/55 px-3 py-2">
                            <span className="text-foreground/75">Name</span>
                            <span className="font-medium">{user.name}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/55 px-3 py-2">
                            <span className="text-foreground/75">Role</span>
                            <span className="font-medium">
                                {formatRole(user.role)}
                            </span>
                        </div>
                    </CardContent>
                </Card>
                <Card className="border border-border/70">
                    <CardHeader className="pb-2">
                        <CardTitle className="flex items-center gap-2 text-base">
                            <MailIcon className="h-4 w-4 text-chart-2" />
                            Contact & Security
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2 text-sm">
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/55 px-3 py-2">
                            <span className="text-foreground/75">Email</span>
                            <span className="font-medium">{user.email}</span>
                        </div>
                        <div className="flex items-center justify-between gap-2 rounded-md border border-border/60 bg-background/55 px-3 py-2">
                            <span className="inline-flex items-center gap-1 text-foreground/75">
                                <ShieldCheckIcon className="h-4 w-4 text-chart-3" />
                                Status
                            </span>
                            <span className="font-medium">Protected</span>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </section>
    );
}
