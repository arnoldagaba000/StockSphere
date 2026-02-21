import { Badge } from "@/components/ui/badge";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import type { AppUserRole } from "@/lib/auth/roles";
import type { ManagedUser } from "./types";
import UserManagementActions from "./user-management-actions";
import UserRoleSelect from "./user-role-select";

interface UserManagementTableProps {
    busyUserId: string | null;
    currentUserId: string;
    currentUserRole: string | null | undefined;
    onBanUser: (userId: string) => Promise<void>;
    onDeleteUser: (userId: string) => Promise<void>;
    onImpersonateUser: (userId: string) => Promise<void>;
    onRevokeSessions: (userId: string) => Promise<void>;
    onUnbanUser: (userId: string) => Promise<void>;
    onUpdateRole: (userId: string, role: AppUserRole) => Promise<void>;
    users: ManagedUser[];
}

const canManageTarget = (
    actorRole: string | null | undefined,
    targetRole: string | null | undefined
): boolean => actorRole === "SUPER_ADMIN" || targetRole !== "SUPER_ADMIN";

const UserManagementTable = ({
    busyUserId,
    currentUserId,
    currentUserRole,
    onBanUser,
    onDeleteUser,
    onImpersonateUser,
    onRevokeSessions,
    onUnbanUser,
    onUpdateRole,
    users,
}: UserManagementTableProps) => {
    const canAssignSuperAdmin = currentUserRole === "SUPER_ADMIN";
    const canImpersonate = currentUserRole === "SUPER_ADMIN";

    return (
        <Table className="min-w-[980px]">
            <TableHeader className="bg-muted/40">
                <TableRow>
                    <TableHead className="px-4 py-3">Name</TableHead>
                    <TableHead className="px-4 py-3">Email</TableHead>
                    <TableHead className="px-4 py-3">Role</TableHead>
                    <TableHead className="px-4 py-3">Status</TableHead>
                    <TableHead className="px-4 py-3 text-right">
                        Actions
                    </TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {users.map((user) => {
                    const isBusy = busyUserId === user.id;
                    const manageable = canManageTarget(
                        currentUserRole,
                        user.role
                    );
                    const isCurrentUser = user.id === currentUserId;
                    const selectedRole = (user.role ?? "VIEWER") as AppUserRole;

                    return (
                        <TableRow key={user.id}>
                            <TableCell className="max-w-52 truncate px-4 py-3 font-medium">
                                {user.name}
                            </TableCell>
                            <TableCell className="max-w-72 truncate px-4 py-3 text-muted-foreground">
                                {user.email}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <UserRoleSelect
                                    canAssignSuperAdmin={canAssignSuperAdmin}
                                    disabled={
                                        !manageable || isBusy || isCurrentUser
                                    }
                                    onChange={(nextRole) =>
                                        onUpdateRole(user.id, nextRole)
                                    }
                                    value={selectedRole}
                                />
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                {user.banned ? (
                                    <Badge variant="destructive">Banned</Badge>
                                ) : (
                                    <Badge variant="secondary">Active</Badge>
                                )}
                            </TableCell>
                            <TableCell className="px-4 py-3">
                                <UserManagementActions
                                    canImpersonate={canImpersonate}
                                    disabled={isBusy}
                                    isBanned={Boolean(user.banned)}
                                    isCurrentUser={isCurrentUser}
                                    isManageable={manageable}
                                    onBan={() => onBanUser(user.id)}
                                    onDelete={() => onDeleteUser(user.id)}
                                    onImpersonate={() =>
                                        onImpersonateUser(user.id)
                                    }
                                    onRevokeSessions={() =>
                                        onRevokeSessions(user.id)
                                    }
                                    onUnban={() => onUnbanUser(user.id)}
                                    userName={user.name}
                                />
                            </TableCell>
                        </TableRow>
                    );
                })}
            </TableBody>
        </Table>
    );
};

export default UserManagementTable;
