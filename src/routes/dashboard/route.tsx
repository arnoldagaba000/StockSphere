import { createFileRoute, Outlet } from "@tanstack/react-router";
import AppSidebar from "@/components/layout/app-sidebar";
import Navbar from "@/components/layout/navbar";
import { SidebarProvider } from "@/components/ui/sidebar";

export const Route = createFileRoute("/dashboard")({
    component: RouteComponent,
});

function RouteComponent() {
    return (
        <SidebarProvider>
            <AppSidebar />

            <div className="flex-1">
                <Navbar />

                <main className="p-4">
                    <Outlet />
                </main>
            </div>
        </SidebarProvider>
    );
}
