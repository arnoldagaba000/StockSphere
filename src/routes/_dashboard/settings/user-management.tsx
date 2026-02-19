import {
    createFileRoute,
    redirect,
    useNavigate,
    useRouter,
} from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import type { ManagedUser } from "@/components/features/user/types";
import UserManagementTable from "@/components/features/user/user-management-table";
import { TooltipProvider } from "@/components/ui/tooltip";
import type { AppUserRole } from "@/lib/auth/roles";
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

interface UserManagementLoaderData {
    currentUser: {
        id: string;
        role: string | null;
    };
    users: ManagedUser[];
}

export const Route = createFileRoute("/_dashboard/settings/user-management")({
    component: UserManagementSettingsPage,
    loader: async (): Promise<UserManagementLoaderData> => {
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
            currentUser: {
                id: currentUser.id,
                role: currentUser.role ?? null,
            },
            users: usersResponse.users as ManagedUser[],
        };
    },
});

function UserManagementSettingsPage() {
    const router = useRouter();
    const navigate = useNavigate();
    const { currentUser, users } = Route.useLoaderData();
    const [busyUserId, setBusyUserId] = useState<string | null>(null);

    const runAction = async (
        userId: string,
        action: () => Promise<unknown>,
        successMessage: string,
        options?: {
            invalidate?: boolean;
            onSuccess?: () => Promise<void>;
        }
    ): Promise<void> => {
        const onSuccess = options?.onSuccess;
        const shouldInvalidate = options?.invalidate !== false;

        try {
            setBusyUserId(userId);
            await action();
            toast.success(successMessage);
            if (onSuccess) {
                await onSuccess();
            }
            if (shouldInvalidate) {
                await router.invalidate();
            }
            setBusyUserId(null);
        } catch (error) {
            setBusyUserId(null);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to perform action.";
            toast.error(message);
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
                    <UserManagementTable
                        busyUserId={busyUserId}
                        currentUserId={currentUser.id}
                        currentUserRole={currentUser.role}
                        onBanUser={(userId) =>
                            runAction(
                                userId,
                                () =>
                                    banManagedUser({
                                        data: {
                                            userId,
                                        },
                                    }),
                                "User banned."
                            )
                        }
                        onDeleteUser={(userId) =>
                            runAction(
                                userId,
                                () =>
                                    removeManagedUser({
                                        data: {
                                            userId,
                                        },
                                    }),
                                "User deleted."
                            )
                        }
                        onImpersonateUser={(userId) =>
                            runAction(
                                userId,
                                () =>
                                    impersonateManagedUser({
                                        data: {
                                            userId,
                                        },
                                    }),
                                "Impersonation started. Switched to impersonated account.",
                                {
                                    invalidate: false,
                                    onSuccess: () =>
                                        navigate({
                                            to: "/",
                                            replace: true,
                                            reloadDocument: true,
                                        }),
                                }
                            )
                        }
                        onRevokeSessions={(userId) =>
                            runAction(
                                userId,
                                () =>
                                    revokeManagedUserSessions({
                                        data: {
                                            userId,
                                        },
                                    }),
                                "All sessions revoked."
                            )
                        }
                        onUnbanUser={(userId) =>
                            runAction(
                                userId,
                                () =>
                                    unbanManagedUser({
                                        data: {
                                            userId,
                                        },
                                    }),
                                "User unbanned."
                            )
                        }
                        onUpdateRole={(userId, role: AppUserRole) =>
                            runAction(
                                userId,
                                () =>
                                    updateManagedUserRole({
                                        data: {
                                            role,
                                            userId,
                                        },
                                    }),
                                "Role updated."
                            )
                        }
                        users={users}
                    />
                </div>
            </section>
        </TooltipProvider>
    );
}
