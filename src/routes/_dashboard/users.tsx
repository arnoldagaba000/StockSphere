import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth/client";
import { type AppUserRole, USER_ROLES } from "@/lib/auth/roles";
import { getUser } from "@/utils/functions/get-user";
import {
    banManagedUser,
    listManagedUsers,
    removeManagedUser,
    revokeManagedUserSessions,
    unbanManagedUser,
    updateManagedUserRole,
} from "@/utils/functions/manage-users";

export const Route = createFileRoute("/_dashboard/users")({
    component: UsersManagementPage,
    loader: async () => {
        const [{ user: currentUser }, usersResponse] = await Promise.all([
            getUser(),
            listManagedUsers(),
        ]);

        return {
            currentUser,
            users: usersResponse.users,
        };
    },
});

const formatRole = (role: string | null | undefined): string => {
    if (!role) {
        return "Staff";
    }

    return role
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
};

const canEditTarget = (
    actorRole: string | null | undefined,
    targetRole: string | null | undefined
): boolean => actorRole === "SUPER_ADMIN" || targetRole !== "SUPER_ADMIN";

function UsersManagementPage() {
    const router = useRouter();
    const { currentUser, users } = Route.useLoaderData();
    const [busyUserId, setBusyUserId] = useState<string | null>(null);

    const isSuperAdmin = currentUser.role === "SUPER_ADMIN";

    const runAction = async (
        userId: string,
        action: () => Promise<unknown>,
        successMessage: string
    ) => {
        try {
            setBusyUserId(userId);
            await action();
            toast.success(successMessage);
            await router.invalidate();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to perform action.";
            toast.error(message);
        } finally {
            setBusyUserId(null);
        }
    };

    return (
        <section className="w-full space-y-4">
            <div>
                <h1 className="font-semibold text-2xl">User Management</h1>
                <p className="text-muted-foreground text-sm">
                    Admins can manage users. Only super admins can impersonate
                    and assign the super admin role.
                </p>
            </div>

            <div className="overflow-x-auto rounded-lg border">
                <table className="w-full min-w-220 text-left text-sm">
                    <thead className="bg-muted/40">
                        <tr className="border-b">
                            <th className="px-4 py-3 font-medium">Name</th>
                            <th className="px-4 py-3 font-medium">Email</th>
                            <th className="px-4 py-3 font-medium">Role</th>
                            <th className="px-4 py-3 font-medium">Status</th>
                            <th className="px-4 py-3 text-right font-medium">
                                Actions
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {users.map((user) => {
                            const isBusy = busyUserId === user.id;
                            const editable = canEditTarget(
                                currentUser.role,
                                user.role
                            );
                            const isCurrentUser = user.id === currentUser.id;
                            const selectedRole = (user.role ??
                                "STAFF") as AppUserRole;

                            return (
                                <tr className="border-b" key={user.id}>
                                    <td className="px-4 py-3">
                                        <div className="font-medium">
                                            {user.name}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-muted-foreground">
                                        {user.email}
                                    </td>
                                    <td className="px-4 py-3">
                                        <select
                                            className="h-9 min-w-36 rounded-md border bg-background px-2 text-sm"
                                            disabled={!editable || isBusy}
                                            onChange={(event) =>
                                                runAction(
                                                    user.id,
                                                    () =>
                                                        updateManagedUserRole({
                                                            data: {
                                                                role: event
                                                                    .target
                                                                    .value as AppUserRole,
                                                                userId: user.id,
                                                            },
                                                        }),
                                                    "Role updated."
                                                )
                                            }
                                            value={selectedRole}
                                        >
                                            {USER_ROLES.map((roleOption) => (
                                                <option
                                                    disabled={
                                                        !isSuperAdmin &&
                                                        roleOption ===
                                                            "SUPER_ADMIN"
                                                    }
                                                    key={roleOption}
                                                    value={roleOption}
                                                >
                                                    {formatRole(roleOption)}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-4 py-3">
                                        {user.banned ? (
                                            <Badge variant="destructive">
                                                Banned
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary">
                                                Active
                                            </Badge>
                                        )}
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex justify-end gap-2">
                                            {user.banned ? (
                                                <Button
                                                    disabled={
                                                        !editable || isBusy
                                                    }
                                                    onClick={() =>
                                                        runAction(
                                                            user.id,
                                                            () =>
                                                                unbanManagedUser(
                                                                    {
                                                                        data: {
                                                                            userId: user.id,
                                                                        },
                                                                    }
                                                                ),
                                                            "User unbanned."
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Unban
                                                </Button>
                                            ) : (
                                                <Button
                                                    disabled={
                                                        !editable || isBusy
                                                    }
                                                    onClick={() =>
                                                        runAction(
                                                            user.id,
                                                            () =>
                                                                banManagedUser({
                                                                    data: {
                                                                        userId: user.id,
                                                                    },
                                                                }),
                                                            "User banned."
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Ban
                                                </Button>
                                            )}

                                            <Button
                                                disabled={
                                                    !editable ||
                                                    isBusy ||
                                                    isCurrentUser
                                                }
                                                onClick={() =>
                                                    runAction(
                                                        user.id,
                                                        () =>
                                                            revokeManagedUserSessions(
                                                                {
                                                                    data: {
                                                                        userId: user.id,
                                                                    },
                                                                }
                                                            ),
                                                        "All sessions revoked."
                                                    )
                                                }
                                                size="sm"
                                                variant="outline"
                                            >
                                                Revoke Sessions
                                            </Button>

                                            {isSuperAdmin ? (
                                                <Button
                                                    disabled={
                                                        isBusy || isCurrentUser
                                                    }
                                                    onClick={() =>
                                                        runAction(
                                                            user.id,
                                                            () =>
                                                                authClient.admin.impersonateUser(
                                                                    {
                                                                        userId: user.id,
                                                                    }
                                                                ),
                                                            "Impersonation started."
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="outline"
                                                >
                                                    Impersonate
                                                </Button>
                                            ) : null}

                                            {isSuperAdmin ? (
                                                <Button
                                                    disabled={
                                                        isBusy || isCurrentUser
                                                    }
                                                    onClick={() =>
                                                        runAction(
                                                            user.id,
                                                            () =>
                                                                removeManagedUser(
                                                                    {
                                                                        data: {
                                                                            userId: user.id,
                                                                        },
                                                                    }
                                                                ),
                                                            "User removed."
                                                        )
                                                    }
                                                    size="sm"
                                                    variant="destructive"
                                                >
                                                    Delete
                                                </Button>
                                            ) : null}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
