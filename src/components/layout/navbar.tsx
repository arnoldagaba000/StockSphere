import { Link, useLocation } from "@tanstack/react-router";
import { useMemo } from "react";
import ThemeToggler from "@/components/layout/theme-toggler";
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";

interface BreadcrumbEntry {
    href: string;
    label: string;
}

const toTitleCase = (value: string) =>
    value
        .split("-")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");

const Navbar = () => {
    const location = useLocation();
    const breadcrumbs = useMemo<BreadcrumbEntry[]>(() => {
        const pathname = location.pathname;
        if (pathname === "/") {
            return [{ href: "/", label: "Dashboard" }];
        }

        const segments = pathname.split("/").filter(Boolean);
        const pathEntries = segments.map((segment, index) => ({
            href: `/${segments.slice(0, index + 1).join("/")}`,
            label: toTitleCase(segment),
        }));

        return [{ href: "/", label: "Dashboard" }, ...pathEntries];
    }, [location.pathname]);

    return (
        <header className="border-b px-4 py-3 shadow">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <SidebarTrigger />

                    <Separator
                        className="mr-2 data-[orientation=vertical]:h-6"
                        orientation="vertical"
                    />

                    <Breadcrumb>
                        <BreadcrumbList>
                            {breadcrumbs.map((breadcrumb, index) => {
                                const isLast = index === breadcrumbs.length - 1;

                                return (
                                    <BreadcrumbItem key={breadcrumb.href}>
                                        {isLast ? (
                                            <BreadcrumbPage>
                                                {breadcrumb.label}
                                            </BreadcrumbPage>
                                        ) : (
                                            <BreadcrumbLink
                                                render={
                                                    <Link
                                                        to={breadcrumb.href}
                                                    />
                                                }
                                            >
                                                {breadcrumb.label}
                                            </BreadcrumbLink>
                                        )}

                                        {isLast ? null : (
                                            <BreadcrumbSeparator />
                                        )}
                                    </BreadcrumbItem>
                                );
                            })}
                        </BreadcrumbList>
                    </Breadcrumb>
                </div>

                <ThemeToggler />
            </div>
        </header>
    );
};

export default Navbar;
