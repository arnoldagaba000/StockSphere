import { Link } from "@tanstack/react-router";
import { ChevronRightIcon, type LucideIcon } from "lucide-react";
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarMenuSub,
    SidebarMenuSubButton,
    SidebarMenuSubItem,
    useSidebar,
} from "@/components/ui/sidebar";

export interface NavMainProps {
    mainItems: {
        title: string;
        to: string;
        icon?: LucideIcon;
        activeOptions: { exact: boolean };
        items?: {
            title: string;
            to: string;
            activeOptions: { exact: boolean };
        }[];
    }[];
}

const NavMain = ({ mainItems }: NavMainProps) => {
    const { isMobile, setOpenMobile } = useSidebar();

    const handleNavigation = () => {
        if (isMobile) {
            setOpenMobile(false);
        }
    };

    return (
        <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>

            <SidebarMenu className="space-y-2">
                {mainItems.map((nav) => {
                    const hasNestedItems =
                        Array.isArray(nav.items) && nav.items.length > 0;

                    if (!hasNestedItems) {
                        return (
                            <SidebarMenuItem key={nav.title}>
                                <SidebarMenuButton
                                    render={
                                        <Link
                                            activeOptions={nav.activeOptions}
                                            activeProps={{
                                                className:
                                                    "bg-primary text-primary-foreground",
                                            }}
                                            className="rounded-md"
                                            onClick={handleNavigation}
                                            to={nav.to}
                                        />
                                    }
                                >
                                    {nav.icon && <nav.icon />}
                                    <span>{nav.title}</span>
                                </SidebarMenuButton>
                            </SidebarMenuItem>
                        );
                    }

                    return (
                        <Collapsible
                            className="group/collapsible"
                            defaultOpen={false}
                            key={nav.title}
                        >
                            <SidebarMenuItem>
                                <CollapsibleTrigger
                                    render={
                                        <SidebarMenuButton tooltip={nav.title}>
                                            {nav.icon && <nav.icon />}
                                            <span>{nav.title}</span>
                                            <ChevronRightIcon className="ml-auto shrink-0 transition-transform duration-200 group-data-[open]/collapsible:rotate-90" />
                                        </SidebarMenuButton>
                                    }
                                />

                                <CollapsibleContent>
                                    <SidebarMenuSub>
                                        {nav.items?.map((item) => (
                                            <SidebarMenuSubItem
                                                key={item.title}
                                            >
                                                <SidebarMenuSubButton
                                                    render={
                                                        <Link
                                                            activeOptions={
                                                                item.activeOptions
                                                            }
                                                            activeProps={{
                                                                className:
                                                                    "bg-primary text-primary-foreground",
                                                            }}
                                                            className="rounded-md"
                                                            onClick={
                                                                handleNavigation
                                                            }
                                                            to={item.to}
                                                        />
                                                    }
                                                >
                                                    <span>{item.title}</span>
                                                </SidebarMenuSubButton>
                                            </SidebarMenuSubItem>
                                        ))}
                                    </SidebarMenuSub>
                                </CollapsibleContent>
                            </SidebarMenuItem>
                        </Collapsible>
                    );
                })}
            </SidebarMenu>
        </SidebarGroup>
    );
};

export default NavMain;
