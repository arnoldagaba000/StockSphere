import { UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthUser as User } from "@/lib/auth/config";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    user: User;
    size?: "lg" | "md" | "sm";
}

const UserAvatar = ({ user, size = "sm" }: UserAvatarProps) => (
    <Avatar
        className={cn({
            "h-8 w-8 rounded-lg": size === "sm",
            "h-10 w-10 rounded-xl": size === "md",
            "h-20 w-20 rounded-full": size === "lg",
        })}
    >
        <AvatarImage alt={user.name} src={user.image ?? undefined} />
        <AvatarFallback
            className={cn({
                "rounded-lg": size === "sm",
                "rounded-xl": size === "md",
                "rounded-full": size === "lg",
            })}
        >
            <UserIcon className="size-4" />
        </AvatarFallback>
    </Avatar>
);

export default UserAvatar;
