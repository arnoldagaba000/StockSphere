import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import {
    FolderTreeIcon,
    MapPinIcon,
    PackageIcon,
    SearchIcon,
    ShoppingCartIcon,
    StoreIcon,
    TruckIcon,
    UsersIcon,
    WarehouseIcon,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import {
    type GlobalSearchItem,
    globalSearch,
} from "@/features/search/global-search";
import { getNavData } from "@/utils/data/nav";

interface SearchItem {
    group: string;
    keywords: string;
    label: string;
    to: string;
}

interface GlobalSearchProps {
    role: string | null | undefined;
}

const buildSearchItems = (role: string | null | undefined): SearchItem[] => {
    const navItems = getNavData(role);
    const results: SearchItem[] = [];

    for (const item of navItems) {
        results.push({
            group: "Pages",
            keywords: `${item.title} ${item.to}`.toLowerCase(),
            label: item.title,
            to: item.to,
        });

        if (Array.isArray(item.items)) {
            for (const child of item.items) {
                results.push({
                    group: item.title,
                    keywords:
                        `${item.title} ${child.title} ${child.to}`.toLowerCase(),
                    label: `${item.title} / ${child.title}`,
                    to: child.to,
                });
            }
        }
    }

    const uniqueResults = new Map<string, SearchItem>();
    for (const result of results) {
        uniqueResults.set(`${result.label}-${result.to}`, result);
    }

    return [...uniqueResults.values()];
};

const groupSearchItems = (items: SearchItem[]) => {
    const groupedItems = new Map<string, SearchItem[]>();

    for (const item of items) {
        const existingItems = groupedItems.get(item.group) ?? [];
        groupedItems.set(item.group, [...existingItems, item]);
    }

    return [...groupedItems.entries()];
};

const getShortcutLabel = (): string => {
    if (typeof window === "undefined") {
        return "Ctrl K";
    }
    return window.navigator.platform.toLowerCase().includes("mac")
        ? "⌘ K"
        : "Ctrl K";
};

const GlobalSearch = ({ role }: GlobalSearchProps) => {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [shortcutLabel] = useState(getShortcutLabel);
    const [queryText, setQueryText] = useState("");
    const searchItems = useMemo(() => buildSearchItems(role), [role]);
    const groupedSearchItems = useMemo(
        () => groupSearchItems(searchItems),
        [searchItems]
    );
    const trimmedQueryText = queryText.trim();
    const debouncedQueryText = useDebouncedValue(trimmedQueryText, 250);

    const { data: entityResults = [], isFetching: isEntitySearchLoading } =
        useQuery({
            enabled: isOpen && debouncedQueryText.length >= 2,
            queryFn: () =>
                globalSearch({
                    data: {
                        limit: 5,
                        query: debouncedQueryText,
                    },
                }),
            queryKey: ["global-search", debouncedQueryText],
            staleTime: 30 * 1000,
        });
    const groupedEntityResults = useMemo(
        () => groupEntityResults(entityResults),
        [entityResults]
    );

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const isShortcut =
                (event.key === "k" || event.key === "K") &&
                (event.metaKey || event.ctrlKey);

            if (isShortcut) {
                event.preventDefault();
                setIsOpen((previousState) => !previousState);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    const handleSelectItem = (to: string) => {
        setIsOpen(false);
        setQueryText("");
        navigate({
            to,
        });
    };

    return (
        <>
            <Button
                className="h-9 w-9 rounded-lg border bg-muted/40 px-0 text-muted-foreground sm:w-80 sm:justify-between sm:px-3"
                onClick={() => setIsOpen(true)}
                type="button"
                variant="outline"
            >
                <span className="sr-only">Open global search</span>
                <span className="inline-flex items-center gap-2 text-sm sm:not-sr-only">
                    <SearchIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Search anything...</span>
                </span>
                <span className="hidden rounded-md border bg-background px-1.5 py-0.5 font-mono text-[10px] leading-none lg:inline-flex">
                    {shortcutLabel}
                </span>
            </Button>

            <CommandDialog
                description="Search pages and navigate quickly."
                onOpenChange={(isDialogOpen) => {
                    setIsOpen(isDialogOpen);
                    if (!isDialogOpen) {
                        setQueryText("");
                    }
                }}
                open={isOpen}
                title="Global Search"
            >
                <Command className="rounded-none border-0">
                    <CommandInput
                        onValueChange={setQueryText}
                        placeholder="Search pages, modules, products, customers..."
                        value={queryText}
                    />
                    <CommandList>
                        <CommandEmpty>
                            {debouncedQueryText.length < 2
                                ? "Type at least 2 characters to search entities."
                                : "No matching results."}
                        </CommandEmpty>
                        {groupedSearchItems.map(([group, items]) => (
                            <CommandGroup heading={group} key={group}>
                                {items.map((item) => (
                                    <CommandItem
                                        key={`${item.label}-${item.to}`}
                                        keywords={[item.keywords]}
                                        onSelect={() =>
                                            handleSelectItem(item.to)
                                        }
                                        value={item.label}
                                    >
                                        <SearchIcon className="h-4 w-4 text-muted-foreground" />
                                        <span>{item.label}</span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                        {groupedEntityResults.map(([group, items]) => (
                            <CommandGroup heading={group} key={group}>
                                {items.map((item) => (
                                    <CommandItem
                                        key={item.id}
                                        keywords={[
                                            item.label.toLowerCase(),
                                            item.description.toLowerCase(),
                                        ]}
                                        onSelect={() =>
                                            handleSelectItem(item.href)
                                        }
                                        value={`${item.label} ${item.description}`}
                                    >
                                        <EntityIcon
                                            className="h-4 w-4 text-muted-foreground"
                                            group={item.group}
                                        />
                                        <div className="flex min-w-0 flex-col">
                                            <span className="truncate">
                                                {item.label}
                                            </span>
                                            <span className="truncate text-muted-foreground text-xs">
                                                {item.description}
                                            </span>
                                        </div>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        ))}
                        {isEntitySearchLoading ? (
                            <CommandGroup heading="Entities">
                                <CommandItem disabled value="searching">
                                    <SearchIcon className="h-4 w-4 text-muted-foreground" />
                                    <div className="flex w-full flex-col gap-1">
                                        <Skeleton className="h-3.5 w-28" />
                                        <Skeleton className="h-3 w-44" />
                                    </div>
                                </CommandItem>
                            </CommandGroup>
                        ) : null}
                    </CommandList>
                </Command>
            </CommandDialog>
        </>
    );
};

function EntityIcon({
    className,
    group,
}: {
    className?: string;
    group: string;
}) {
    switch (group) {
        case "Products":
            return <PackageIcon className={className} />;
        case "Categories":
            return <FolderTreeIcon className={className} />;
        case "Customers":
            return <UsersIcon className={className} />;
        case "Suppliers":
            return <TruckIcon className={className} />;
        case "Purchase Orders":
        case "Sales Orders":
            return <ShoppingCartIcon className={className} />;
        case "Warehouses":
            return <WarehouseIcon className={className} />;
        case "Locations":
            return <MapPinIcon className={className} />;
        default:
            return <StoreIcon className={className} />;
    }
}

const groupEntityResults = (items: GlobalSearchItem[]) => {
    const groupedItems = new Map<string, GlobalSearchItem[]>();

    for (const item of items) {
        const existingItems = groupedItems.get(item.group) ?? [];
        groupedItems.set(item.group, [...existingItems, item]);
    }

    return [...groupedItems.entries()];
};

const useDebouncedValue = (value: string, delayMs: number): string => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const timeoutId = window.setTimeout(() => {
            setDebouncedValue(value);
        }, delayMs);

        return () => {
            window.clearTimeout(timeoutId);
        };
    }, [delayMs, value]);

    return debouncedValue;
};

export default GlobalSearch;
