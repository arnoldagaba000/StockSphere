import { Badge } from "@/components/ui/badge";
import type { AuthUser as User } from "@/lib/auth/config";

const formatRole = (role: string | null | undefined): string => {
    if (!role) {
        return "Viewer";
    }

    return role
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

interface UserDetailsProps {
    compact?: boolean;
    showRole?: boolean;
    user: User;
}

const UserDetails = ({
    compact = false,
    showRole = true,
    user,
}: UserDetailsProps) => (
    <div className="grid flex-1 gap-0.5 text-left leading-tight">
        <span className="truncate font-medium text-sm">{user.name}</span>
        <span className="truncate text-muted-foreground text-xs">
            {user.email}
        </span>
        {showRole ? (
            <Badge
                className={compact ? "mt-0.5 w-fit text-[10px]" : "mt-1 w-fit"}
                variant="secondary"
            >
                {formatRole(user.role)}
            </Badge>
        ) : null}
    </div>
);

export default UserDetails;
