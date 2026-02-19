import { createFileRoute, Link } from "@tanstack/react-router";
import UserAvatar from "@/components/layout/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
        <section className="w-full max-w-3xl space-y-4 p-6">
            <div className="flex items-center gap-4">
                <UserAvatar size="lg" user={user} />
                <div className="space-y-1">
                    <h1 className="font-semibold text-2xl">{user.name}</h1>
                    <p className="text-muted-foreground text-sm">
                        {user.email}
                    </p>
                    <Badge variant="secondary">{formatRole(user.role)}</Badge>
                </div>
            </div>

            <div className="rounded-md border bg-muted/20 p-4 text-sm">
                <p className="text-muted-foreground">
                    This page is your profile overview. Use settings to update
                    your profile details and security configuration.
                </p>
            </div>

            <div className="flex flex-wrap gap-2">
                <Button
                    render={<Link to="/settings/profile" />}
                    variant="outline"
                >
                    Edit Profile Settings
                </Button>
                <Button
                    render={<Link to="/settings/security" />}
                    variant="outline"
                >
                    Security Settings
                </Button>
            </div>
        </section>
    );
}
