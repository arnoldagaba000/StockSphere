import { createFileRoute, Outlet } from "@tanstack/react-router";
import Navbar from "@/components/layout/navbar";
import AppSidebar from "@/components/layout/sidebar/app-sidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { getSession, getUser } from "@/utils/functions/get-user";

export const Route = createFileRoute("/_dashboard")({
    component: DashboardLayout,
    loader: async () => {
        const [{ user }, { session }] = await Promise.all([
            getUser(),
            getSession(),
        ]);

        return {
            isImpersonating: Boolean(session.impersonatedBy),
            user,
        };
    },
});

function DashboardLayout() {
    const { user, isImpersonating } = Route.useLoaderData();

    return (
        <SidebarProvider>
            <AppSidebar isImpersonating={isImpersonating} user={user} />

            <div className="flex flex-1 flex-col">
                <Navbar />

                <main className="flex flex-1 p-4">
                    <Outlet />
                </main>
            </div>
        </SidebarProvider>
    );
}
