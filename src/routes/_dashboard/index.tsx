import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_dashboard/")({
    component: HomePage,
});

function HomePage() {
    return (
        <div className="space-y-4">
            <h1 className="font-semibold text-2xl">Dashboard</h1>
            <p className="text-muted-foreground text-sm">
                Welcome to your IMS dashboard.
            </p>
            <div className="flex gap-2">
                <Button render={<Link to="/profile" />} variant="outline">
                    My Profile
                </Button>
                <Button render={<Link to="/settings/profile" />}>
                    Open Settings
                </Button>
            </div>
        </div>
    );
}
