import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { GalleryVerticalEndIcon } from "lucide-react";

export const Route = createFileRoute("/_auth")({
    component: AuthLayout,
});

function AuthLayout() {
    return (
        <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted p-6 md:p-10">
            <div className="flex w-full flex-col items-center justify-center gap-4">
                <Link
                    className="flex items-center gap-2 self-center font-medium"
                    to="/"
                >
                    <div className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                        <GalleryVerticalEndIcon className="size-4" />
                    </div>
                    Stock Sphere
                </Link>

                <Outlet />
            </div>
        </div>
    );
}
