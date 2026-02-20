import { createFileRoute, useRouter } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { useReducer } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    changeCurrentUserPassword,
    listCurrentUserSessions,
    requestCurrentUserEmailChange,
    revokeCurrentUserSession,
} from "@/utils/functions/account-settings";
import { getUser } from "@/utils/functions/get-user";

interface ConfirmActionButtonProps {
    confirmDescription: string;
    confirmTitle: string;
    disabled?: boolean;
    label: string;
    onConfirm: () => Promise<void>;
}

const ConfirmActionButton = ({
    confirmDescription,
    confirmTitle,
    disabled = false,
    label,
    onConfirm,
}: ConfirmActionButtonProps) => (
    <AlertDialog>
        <AlertDialogTrigger
            disabled={disabled}
            render={
                <Button disabled={disabled} size="sm" variant="outline">
                    {label}
                </Button>
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
);

interface SecuritySettingsPageState {
    confirmPassword: string;
    currentPassword: string;
    isSubmittingEmail: boolean;
    isSubmittingPassword: boolean;
    newEmail: string;
    newPassword: string;
    revokingToken: string | null;
}

type SecuritySettingsPageAction =
    | Partial<SecuritySettingsPageState>
    | ((
          state: SecuritySettingsPageState
      ) => Partial<SecuritySettingsPageState>);

const securitySettingsPageReducer = (
    state: SecuritySettingsPageState,
    action: SecuritySettingsPageAction
): SecuritySettingsPageState => {
    const patch = typeof action === "function" ? action(state) : action;
    return {
        ...state,
        ...patch,
    };
};

export const Route = createFileRoute("/_dashboard/settings/security")({
    component: SecuritySettingsPage,
    loader: async () => {
        const [{ user }, sessionData] = await Promise.all([
            getUser(),
            listCurrentUserSessions(),
        ]);

        return {
            currentSessionToken: sessionData.currentSessionToken,
            sessions: sessionData.sessions,
            user,
        };
    },
});

function SecuritySettingsPage() {
    const router = useRouter();
    const { currentSessionToken, sessions, user } = Route.useLoaderData();

    const [state, setState] = useReducer(securitySettingsPageReducer, {
        confirmPassword: "",
        currentPassword: "",
        isSubmittingEmail: false,
        isSubmittingPassword: false,
        newEmail: "",
        newPassword: "",
        revokingToken: null,
    });

    const handleChangePassword = async () => {
        if (state.newPassword !== state.confirmPassword) {
            toast.error("New password and confirmation do not match.");
            return;
        }

        try {
            setState({ isSubmittingPassword: true });
            await changeCurrentUserPassword({
                data: {
                    currentPassword: state.currentPassword,
                    newPassword: state.newPassword,
                    revokeOtherSessions: true,
                },
            });
            toast.success("Password changed successfully.");
            setState({
                confirmPassword: "",
                currentPassword: "",
                newPassword: "",
            });
            await router.invalidate();
            setState({ isSubmittingPassword: false });
        } catch (error) {
            setState({ isSubmittingPassword: false });
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to change password.";
            toast.error(message);
        }
    };

    const handleRequestEmailChange = async () => {
        try {
            setState({ isSubmittingEmail: true });
            await requestCurrentUserEmailChange({
                data: {
                    newEmail: state.newEmail,
                },
            });
            toast.success("Verification email sent to confirm email change.");
            setState({ isSubmittingEmail: false });
        } catch (error) {
            setState({ isSubmittingEmail: false });
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to request email change.";
            toast.error(message);
        }
    };

    const handleRevokeSession = async (token: string) => {
        try {
            setState({ revokingToken: token });
            await revokeCurrentUserSession({ data: { token } });
            toast.success("Session revoked.");
            await router.invalidate();
            setState({ revokingToken: null });
        } catch (error) {
            setState({ revokingToken: null });
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to revoke session.";
            toast.error(message);
        }
    };

    return (
        <div className="max-w-3xl space-y-4">
            <section className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                    <h2 className="font-medium text-lg">Change Password</h2>
                    <p className="text-muted-foreground text-sm">
                        Password must be at least 10 characters and include
                        uppercase, lowercase, number, and symbol.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="current-password">Current Password</Label>
                    <Input
                        id="current-password"
                        onChange={(event) =>
                            setState({ currentPassword: event.target.value })
                        }
                        type="password"
                        value={state.currentPassword}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new-password">New Password</Label>
                    <Input
                        id="new-password"
                        onChange={(event) =>
                            setState({ newPassword: event.target.value })
                        }
                        type="password"
                        value={state.newPassword}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="confirm-password">
                        Confirm New Password
                    </Label>
                    <Input
                        id="confirm-password"
                        onChange={(event) =>
                            setState({ confirmPassword: event.target.value })
                        }
                        type="password"
                        value={state.confirmPassword}
                    />
                </div>

                <Button
                    disabled={state.isSubmittingPassword}
                    onClick={handleChangePassword}
                >
                    {state.isSubmittingPassword
                        ? "Updating..."
                        : "Update Password"}
                </Button>
            </section>

            <section className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                    <h2 className="font-medium text-lg">Change Email</h2>
                    <p className="text-muted-foreground text-sm">
                        We will send a verification link before your email is
                        changed.
                    </p>
                </div>

                <div className="space-y-2">
                    <Label htmlFor="new-email">New Email Address</Label>
                    <Input
                        id="new-email"
                        onChange={(event) =>
                            setState({ newEmail: event.target.value })
                        }
                        placeholder={`Current: ${user.email}`}
                        type="email"
                        value={state.newEmail}
                    />
                </div>

                <Button
                    disabled={
                        state.isSubmittingEmail ||
                        state.newEmail.trim().length === 0
                    }
                    onClick={handleRequestEmailChange}
                >
                    {state.isSubmittingEmail
                        ? "Sending..."
                        : "Request Email Change"}
                </Button>
            </section>

            <section className="space-y-4 rounded-lg border p-4">
                <div className="space-y-1">
                    <h2 className="font-medium text-lg">Active Sessions</h2>
                    <p className="text-muted-foreground text-sm">
                        Review and revoke sessions from devices you no longer
                        trust.
                    </p>
                </div>

                <div className="space-y-2">
                    {sessions.map((session) => {
                        const isCurrent = session.token === currentSessionToken;
                        const isRevoking =
                            state.revokingToken === session.token;

                        return (
                            <div
                                className="flex items-center justify-between rounded-md border px-3 py-2"
                                key={session.id}
                            >
                                <div className="space-y-1">
                                    <p className="font-medium text-sm">
                                        {session.userAgent ?? "Unknown device"}
                                    </p>
                                    <p className="text-muted-foreground text-xs">
                                        {session.ipAddress ?? "Unknown IP"} ·
                                        Last updated{" "}
                                        {formatDistanceToNow(
                                            session.updatedAt,
                                            {
                                                addSuffix: true,
                                            }
                                        )}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isCurrent ? (
                                        <Badge variant="secondary">
                                            Current
                                        </Badge>
                                    ) : null}
                                    <ConfirmActionButton
                                        confirmDescription="The device will be signed out immediately."
                                        confirmTitle="Revoke this session?"
                                        disabled={isCurrent || isRevoking}
                                        label={
                                            isRevoking
                                                ? "Revoking..."
                                                : "Revoke"
                                        }
                                        onConfirm={() =>
                                            handleRevokeSession(session.token)
                                        }
                                    />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
