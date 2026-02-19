import {
    Boxes,
    FolderTree,
    LayoutDashboard,
    MapPinned,
    PackageSearch,
    Settings,
    UserCircle2,
    Warehouse,
} from "lucide-react";
import type { NavMainProps } from "@/components/layout/sidebar/nav-main";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

export const getNavData = (
    role: string | null | undefined
): NavMainProps["mainItems"] => {
    const settingsItems = [
        {
            title: "Profile Settings",
            to: "/settings/profile",
            activeOptions: { exact: false },
        },
        {
            title: "Security",
            to: "/settings/security",
            activeOptions: { exact: false },
        },
    ];

    if (
        typeof role === "string" &&
        ADMIN_ROLES.includes(role as (typeof ADMIN_ROLES)[number])
    ) {
        settingsItems.push({
            title: "User Management",
            to: "/settings/user-management",
            activeOptions: { exact: false },
        });
    }

    return [
        {
            title: "Dashboard",
            to: "/",
            icon: LayoutDashboard,
            activeOptions: { exact: true },
        },
        {
            title: "Profile",
            to: "/profile",
            icon: UserCircle2,
            activeOptions: { exact: true },
        },
        {
            title: "Products",
            to: "/products",
            icon: Boxes,
            activeOptions: { exact: false },
        },
        {
            title: "Categories",
            to: "/categories",
            icon: FolderTree,
            activeOptions: { exact: false },
        },
        {
            title: "Warehouses",
            to: "/warehouses",
            icon: Warehouse,
            activeOptions: { exact: false },
        },
        {
            title: "Locations",
            to: "/locations",
            icon: MapPinned,
            activeOptions: { exact: false },
        },
        {
            title: "Stock",
            to: "/stock",
            icon: PackageSearch,
            activeOptions: { exact: false },
        },
        {
            title: "Settings",
            to: "/settings",
            icon: Settings,
            activeOptions: { exact: false },
            items: settingsItems,
        },
    ];
};
