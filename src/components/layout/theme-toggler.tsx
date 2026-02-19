import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ThemeToggler() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    const displayTheme = theme === "system" ? resolvedTheme : theme;
    const renderThemeIcon = () => {
        if (displayTheme === "light") {
            return <SunIcon aria-hidden="true" size={16} />;
        }
        if (displayTheme === "dark") {
            return <MoonIcon aria-hidden="true" size={16} />;
        }
        return <MonitorIcon aria-hidden="true" size={16} />;
    };

    if (!mounted) {
        return (
            <Button aria-label="Select theme" size="icon" variant="outline">
                <MonitorIcon aria-hidden="true" size={16} />
            </Button>
        );
    }

    return (
        <div>
            <DropdownMenu>
                <DropdownMenuTrigger
                    render={
                        <Button
                            aria-label="Select theme"
                            size="icon"
                            variant="outline"
                        >
                            {renderThemeIcon()}
                        </Button>
                    }
                />

                <DropdownMenuContent className="min-w-32">
                    <DropdownMenuItem onClick={() => setTheme("light")}>
                        <SunIcon
                            aria-hidden="true"
                            className="opacity-60"
                            size={16}
                        />
                        <span>Light</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setTheme("dark")}>
                        <MoonIcon
                            aria-hidden="true"
                            className="opacity-60"
                            size={16}
                        />
                        <span>Dark</span>
                    </DropdownMenuItem>

                    <DropdownMenuItem onClick={() => setTheme("system")}>
                        <MonitorIcon
                            aria-hidden="true"
                            className="opacity-60"
                            size={16}
                        />
                        <span>System</span>
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    );
}
