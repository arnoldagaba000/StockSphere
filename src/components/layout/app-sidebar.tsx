import {
    Sidebar,
    SidebarContent,
    SidebarFooter,
    SidebarGroup,
    SidebarHeader,
} from "../ui/sidebar";

const AppSidebar = () => {
    return (
        <Sidebar collapsible="icon">
            <SidebarHeader />

            <SidebarContent>
                <SidebarGroup />
                <SidebarGroup />
            </SidebarContent>

            <SidebarFooter />
        </Sidebar>
    );
};

export default AppSidebar;
