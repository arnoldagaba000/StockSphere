import { UserIcon } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AuthUser as User } from "@/lib/auth/config";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    user: User;
    size?: "lg" | "sm";
}

const UserAvatar = ({ user, size = "sm" }: UserAvatarProps) => (
    <Avatar
        className={cn(
            size === "sm" ? "h-8 w-8 rounded-lg" : "h-20 w-20 rounded-full"
        )}
    >
        <AvatarImage alt={user.name} src={user.image ?? undefined} />
        <AvatarFallback className="rounded-lg">
            <UserIcon className="size-4" />
        </AvatarFallback>
    </Avatar>
);

export default UserAvatar;
