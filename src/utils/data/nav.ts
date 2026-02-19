import { Boxes, Settings } from "lucide-react";
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
            title: "Workspace",
            to: "/",
            icon: Boxes,
            activeOptions: { exact: false },
            items: [
                {
                    title: "Dashboard",
                    to: "/",
                    activeOptions: { exact: true },
                },
                {
                    title: "Profile",
                    to: "/profile",
                    activeOptions: { exact: true },
                },
                {
                    title: "Products",
                    to: "/products",
                    activeOptions: { exact: false },
                },
            ],
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
