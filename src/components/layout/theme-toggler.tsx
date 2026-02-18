import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ThemeToggler() {
    const { theme, setTheme, resolvedTheme } = useTheme();

    const displayTheme = theme === "system" ? resolvedTheme : theme;

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
                            {displayTheme === "light" && (
                                <SunIcon aria-hidden="true" size={16} />
                            )}
                            {displayTheme === "dark" && (
                                <MoonIcon aria-hidden="true" size={16} />
                            )}
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
