import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { type AppUserRole, USER_ROLES } from "@/lib/auth/roles";
import { getUser } from "@/utils/functions/get-user";
import {
    banManagedUser,
    impersonateManagedUser,
    listManagedUsers,
    removeManagedUser,
    revokeManagedUserSessions,
    unbanManagedUser,
    updateManagedUserRole,
} from "@/utils/functions/manage-users";

const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

interface ConfirmActionButtonProps {
    confirmDescription: string;
    confirmTitle: string;
    disabled?: boolean;
    label: string;
    onConfirm: () => Promise<void>;
    tooltip: string;
    variant?: "destructive" | "outline";
}

const ConfirmActionButton = ({
    confirmDescription,
    confirmTitle,
    disabled = false,
    label,
    onConfirm,
    tooltip,
    variant = "outline",
}: ConfirmActionButtonProps) => (
    <Tooltip>
        <AlertDialog>
            <AlertDialogTrigger
                disabled={disabled}
                render={
                    <TooltipTrigger
                        render={
                            <Button
                                disabled={disabled}
                                size="sm"
                                variant={variant}
                            >
                                {label}
                            </Button>
                        }
                    />
                }
            />
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
                    <AlertDialogDescription>
                        {confirmDescription}
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={onConfirm}>
                        Confirm
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <TooltipContent>{tooltip}</TooltipContent>
    </Tooltip>
);

export const Route = createFileRoute("/_dashboard/settings/user-management")({
    component: UserManagementSettingsPage,
    loader: async () => {
        const { user: currentUser } = await getUser();

        if (
            !(
                typeof currentUser.role === "string" &&
                ADMIN_ROLES.includes(
                    currentUser.role as (typeof ADMIN_ROLES)[number]
                )
            )
        ) {
            throw redirect({ to: "/settings/profile" });
        }

        const usersResponse = await listManagedUsers();

        return {
            currentUser,
            users: usersResponse.users,
        };
    },
});

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

const canManageTarget = (
    actorRole: string | null | undefined,
    targetRole: string | null | undefined
): boolean => actorRole === "SUPER_ADMIN" || targetRole !== "SUPER_ADMIN";

function UserManagementSettingsPage() {
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
        <TooltipProvider delay={150}>
            <section className="space-y-4">
                <div className="space-y-1">
                    <h2 className="font-medium text-lg">User Management</h2>
                    <p className="text-muted-foreground text-sm">
                        Available to Admin and Super Admin. Only Super Admin can
                        impersonate users.
                    </p>
                </div>

                <div className="overflow-x-auto rounded-lg border">
                    <table className="w-full min-w-[880px] text-left text-sm">
                        <thead className="bg-muted/40">
                            <tr className="border-b">
                                <th className="px-4 py-3 font-medium">Name</th>
                                <th className="px-4 py-3 font-medium">Email</th>
                                <th className="px-4 py-3 font-medium">Role</th>
                                <th className="px-4 py-3 font-medium">
                                    Status
                                </th>
                                <th className="px-4 py-3 text-right font-medium">
                                    Actions
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map((user) => {
                                const isBusy = busyUserId === user.id;
                                const manageable = canManageTarget(
                                    currentUser.role,
                                    user.role
                                );
                                const isCurrentUser =
                                    user.id === currentUser.id;
                                const selectedRole = (user.role ??
                                    "VIEWER") as AppUserRole;

                                return (
                                    <tr className="border-b" key={user.id}>
                                        <td className="px-4 py-3 font-medium">
                                            {user.name}
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {user.email}
                                        </td>
                                        <td className="px-4 py-3">
                                            <select
                                                className="h-9 min-w-36 rounded-md border bg-background px-2 text-sm"
                                                disabled={!manageable || isBusy}
                                                onChange={(event) =>
                                                    runAction(
                                                        user.id,
                                                        () =>
                                                            updateManagedUserRole(
                                                                {
                                                                    data: {
                                                                        role: event
                                                                            .target
                                                                            .value as AppUserRole,
                                                                        userId: user.id,
                                                                    },
                                                                }
                                                            ),
                                                        "Role updated."
                                                    )
                                                }
                                                value={selectedRole}
                                            >
                                                {USER_ROLES.map(
                                                    (roleOption) => (
                                                        <option
                                                            disabled={
                                                                !isSuperAdmin &&
                                                                roleOption ===
                                                                    "SUPER_ADMIN"
                                                            }
                                                            key={roleOption}
                                                            value={roleOption}
                                                        >
                                                            {formatRole(
                                                                roleOption
                                                            )}
                                                        </option>
                                                    )
                                                )}
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
                                                    <Tooltip>
                                                        <TooltipTrigger
                                                            render={
                                                                <Button
                                                                    disabled={
                                                                        !manageable ||
                                                                        isBusy
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
                                                            }
                                                        />
                                                        <TooltipContent>
                                                            Restore account
                                                            access for this
                                                            user.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                ) : (
                                                    <Tooltip>
                                                        <TooltipTrigger
                                                            render={
                                                                <Button
                                                                    disabled={
                                                                        !manageable ||
                                                                        isBusy
                                                                    }
                                                                    onClick={() =>
                                                                        runAction(
                                                                            user.id,
                                                                            () =>
                                                                                banManagedUser(
                                                                                    {
                                                                                        data: {
                                                                                            userId: user.id,
                                                                                        },
                                                                                    }
                                                                                ),
                                                                            "User banned."
                                                                        )
                                                                    }
                                                                    size="sm"
                                                                    variant="outline"
                                                                >
                                                                    Ban
                                                                </Button>
                                                            }
                                                        />
                                                        <TooltipContent>
                                                            Block this user from
                                                            signing in.
                                                        </TooltipContent>
                                                    </Tooltip>
                                                )}

                                                <ConfirmActionButton
                                                    confirmDescription={`This will force ${user.name} to sign in again on all devices.`}
                                                    confirmTitle="Revoke all sessions?"
                                                    disabled={
                                                        !manageable ||
                                                        isBusy ||
                                                        isCurrentUser
                                                    }
                                                    label="Revoke Sessions"
                                                    onConfirm={() =>
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
                                                    tooltip="Sign this user out from all active sessions."
                                                />

                                                {isSuperAdmin ? (
                                                    <ConfirmActionButton
                                                        confirmDescription={`You will act as ${user.name} until you stop impersonating.`}
                                                        confirmTitle="Start impersonation?"
                                                        disabled={
                                                            !manageable ||
                                                            isBusy ||
                                                            isCurrentUser
                                                        }
                                                        label="Impersonate"
                                                        onConfirm={() =>
                                                            runAction(
                                                                user.id,
                                                                () =>
                                                                    impersonateManagedUser(
                                                                        {
                                                                            data: {
                                                                                userId: user.id,
                                                                            },
                                                                        }
                                                                    ),
                                                                "Impersonation started."
                                                            )
                                                        }
                                                        tooltip="Temporarily access the app as this user."
                                                    />
                                                ) : null}

                                                <ConfirmActionButton
                                                    confirmDescription={`This will permanently delete ${user.name}'s account.`}
                                                    confirmTitle="Delete user permanently?"
                                                    disabled={
                                                        !manageable ||
                                                        isBusy ||
                                                        isCurrentUser
                                                    }
                                                    label="Delete"
                                                    onConfirm={() =>
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
                                                            "User deleted."
                                                        )
                                                    }
                                                    tooltip="Permanently remove this user account."
                                                    variant="destructive"
                                                />
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </section>
        </TooltipProvider>
    );
}
