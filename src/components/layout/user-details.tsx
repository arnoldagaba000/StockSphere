import type { AuthUser as User } from "@/lib/auth/config";

const UserDetails = ({ user }: { user: User }) => (
    <div className="grid flex-1 text-left text-sm leading-tight">
        <span className="truncate font-medium">{user.name}</span>
        <span className="truncate text-xs">{user.email}</span>
    </div>
);

export default UserDetails;
