import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const noopUnsubscribe = () => {
    return;
};

const ThemeIcon = ({ theme }: { theme: string | undefined }) => {
    if (theme === "light") {
        return <SunIcon aria-hidden="true" size={16} />;
    }
    if (theme === "dark") {
        return <MoonIcon aria-hidden="true" size={16} />;
    }
    return <MonitorIcon aria-hidden="true" size={16} />;
};

export default function ThemeToggler() {
    const { theme, setTheme, resolvedTheme } = useTheme();
    const mounted = useSyncExternalStore(
        () => noopUnsubscribe,
        () => true,
        () => false
    );

    const displayTheme = theme === "system" ? resolvedTheme : theme;

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
                            <ThemeIcon theme={displayTheme} />
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
