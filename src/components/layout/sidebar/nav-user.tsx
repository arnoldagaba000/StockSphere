import { useNavigate } from "@tanstack/react-router";
import {
    ChevronsUpDown,
    LogOut,
    Settings,
    Undo2,
    UserCircle,
} from "lucide-react";
import toast from "react-hot-toast";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from "@/components/ui/sidebar";
import { authClient } from "@/lib/auth/client";
import type { AuthUser as User } from "@/lib/auth/config";
import UserAvatar from "../user-avatar";
import UserDetails from "../user-details";

interface NavUserProps {
    isImpersonating: boolean;
    user: User;
}

const NavUser = ({ user, isImpersonating }: NavUserProps) => {
    const { isMobile, setOpenMobile } = useSidebar();
    const navigate = useNavigate();

    const closeMobileSidebar = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    const handleLogout = async () => {
        closeMobileSidebar();
        await authClient.signOut({
            fetchOptions: {
                onSuccess: () => {
                    toast.success("Logged out successfully");
                    navigate({
                        to: "/login",
                        replace: true,
                        reloadDocument: true,
                    });
                },
                onError: ({ error }) => {
                    toast.error(error.message);
                },
            },
        });
    };

    const handleStopImpersonating = async () => {
        closeMobileSidebar();
        await authClient.admin.stopImpersonating({
            fetchOptions: {
                onSuccess: () => {
                    toast.success("Returned to your admin session.");
                    navigate({
                        to: "/settings/user-management",
                        replace: true,
                        reloadDocument: true,
                    });
                },
                onError: ({ error }) => {
                    toast.error(error.message);
                },
            },
        });
    };

    return (
        <SidebarMenu>
            <SidebarMenuItem>
                <DropdownMenu>
                    <DropdownMenuTrigger
                        render={
                            <SidebarMenuButton
                                className="h-auto gap-3 border border-sidebar-border px-2 py-2 data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                                size="lg"
                            >
                                <UserAvatar user={user} />
                                <UserDetails
                                    compact
                                    showRole={false}
                                    user={user}
                                />

                                <ChevronsUpDown className="ml-auto size-4" />
                            </SidebarMenuButton>
                        }
                    />

                    <DropdownMenuContent
                        align="end"
                        className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-lg"
                        side={isMobile ? "bottom" : "right"}
                        sideOffset={4}
                    >
                        <DropdownMenuGroup>
                            <DropdownMenuLabel className="p-2 font-normal">
                                <div className="flex items-start gap-3 rounded-md border border-sidebar-border bg-sidebar-accent/30 p-3 text-left text-sm">
                                    <UserAvatar size="md" user={user} />
                                    <UserDetails user={user} />
                                </div>
                            </DropdownMenuLabel>

                            <DropdownMenuSeparator />

                            <DropdownMenuGroup>
                                <DropdownMenuItem
                                    onClick={() => {
                                        closeMobileSidebar();
                                        navigate({
                                            to: "/profile",
                                        });
                                    }}
                                >
                                    <UserCircle />
                                    Profile
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={() => {
                                        closeMobileSidebar();
                                        navigate({
                                            to: "/settings/profile",
                                        });
                                    }}
                                >
                                    <Settings />
                                    Settings
                                </DropdownMenuItem>
                            </DropdownMenuGroup>

                            <DropdownMenuSeparator />

                            {isImpersonating ? (
                                <>
                                    <DropdownMenuItem
                                        onClick={handleStopImpersonating}
                                    >
                                        <Undo2 />
                                        Stop Impersonating
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                </>
                            ) : null}

                            <DropdownMenuItem onClick={handleLogout}>
                                <LogOut />
                                Log out
                            </DropdownMenuItem>
                        </DropdownMenuGroup>
                    </DropdownMenuContent>
                </DropdownMenu>
            </SidebarMenuItem>
        </SidebarMenu>
    );
};

export default NavUser;
