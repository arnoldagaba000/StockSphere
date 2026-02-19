import { Link } from "@tanstack/react-router";
import { GalleryVerticalEndIcon } from "lucide-react";
import type { AuthUser as User } from "@/lib/auth/config";
import { getNavData } from "@/utils/data/nav";
import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarRail,
} from "../../ui/sidebar";
import NavMain from "./nav-main";
import NavUser from "./nav-user";

interface AppSidebarProps {
    user: User;
}

const AppSidebar = ({ user }: AppSidebarProps) => {
    const navData = getNavData(user.role);

    return (
        <Sidebar collapsible="icon">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            render={
                                <Link
                                    className="flex items-center gap-3"
                                    to="/"
                                >
                                    <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-primary-foreground">
                                        <GalleryVerticalEndIcon className="size-4" />
                                    </div>

                                    <div className="grid flex-1 text-left text-sm leading-tight">
                                        <span className="font-medium">
                                            Stock Sphere
                                        </span>

                                        <span className="text-muted-foreground text-xs">
                                            Your stock management space
                                        </span>
                                    </div>
                                </Link>
                            }
                            size="lg"
                        />
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain mainItems={navData} />
            </SidebarContent>

            <SidebarFooter>
                <NavUser user={user} />
            </SidebarFooter>
            <SidebarRail />
        </Sidebar>
    );
};

export default AppSidebar;
