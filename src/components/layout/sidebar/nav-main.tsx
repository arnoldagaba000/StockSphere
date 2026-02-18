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
    return (
        <SidebarGroup>
            <SidebarGroupLabel>Navigation</SidebarGroupLabel>

            <SidebarMenu>
                {mainItems.map((nav) => (
                    <Collapsible className="group/collapsible" key={nav.title}>
                        <SidebarMenuItem>
                            <CollapsibleTrigger
                                render={
                                    <SidebarMenuButton tooltip={nav.title}>
                                        {nav.icon && <nav.icon />}
                                        <ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                                    </SidebarMenuButton>
                                }
                            />

                            <CollapsibleContent>
                                <SidebarMenuSub>
                                    {nav.items?.map((item) => (
                                        <SidebarMenuSubItem key={item.title}>
                                            <SidebarMenuSubButton
                                                render={
                                                    <Link
                                                        activeOptions={
                                                            item.activeOptions
                                                        }
                                                        to={item.to}
                                                    >
                                                        <span>
                                                            {item.title}
                                                        </span>
                                                    </Link>
                                                }
                                            />
                                        </SidebarMenuSubItem>
                                    ))}
                                </SidebarMenuSub>
                            </CollapsibleContent>
                        </SidebarMenuItem>
                    </Collapsible>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
};

export default NavMain;
