import { createFileRoute, useRouter } from "@tanstack/react-router";
import { formatDistanceToNow } from "date-fns";
import { MailIcon, ShieldCheckIcon } from "lucide-react";
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
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
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
        <section className="w-full min-w-0 max-w-4xl space-y-4">
            <div className="space-y-1">
                <h1 className="font-semibold text-2xl">Security Settings</h1>
                <p className="text-muted-foreground text-sm">
                    Protect your account by updating credentials and controlling
                    active sessions.
                </p>
            </div>

            <Card className="border border-border/70">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheckIcon className="h-4 w-4 text-primary" />
                        Change Password
                    </CardTitle>
                    <CardDescription>
                        Password must be at least 10 characters and include
                        uppercase, lowercase, number, and symbol.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="current-password">
                            Current Password
                        </Label>
                        <Input
                            id="current-password"
                            onChange={(event) =>
                                setState({
                                    currentPassword: event.target.value,
                                })
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
                                setState({
                                    confirmPassword: event.target.value,
                                })
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
                </CardContent>
            </Card>

            <Card className="border border-border/70">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <MailIcon className="h-4 w-4 text-primary" />
                        Change Email
                    </CardTitle>
                    <CardDescription>
                        We will send a verification link before your email is
                        changed.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
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
                </CardContent>
            </Card>

            <Card className="border border-border/70">
                <CardHeader className="pb-2">
                    <CardTitle>Active Sessions</CardTitle>
                    <CardDescription>
                        Review and revoke sessions from devices you no longer
                        trust.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2">
                    {sessions.map((session) => {
                        const isCurrent = session.token === currentSessionToken;
                        const isRevoking =
                            state.revokingToken === session.token;

                        return (
                            <div
                                className="flex flex-wrap items-start justify-between gap-2 rounded-md border px-3 py-2"
                                key={session.id}
                            >
                                <div className="min-w-0 flex-1 space-y-1">
                                    <p className="truncate font-medium text-sm">
                                        {session.userAgent ?? "Unknown device"}
                                    </p>
                                    <p className="truncate text-muted-foreground text-xs">
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
                                <div className="flex shrink-0 items-center gap-2">
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
                </CardContent>
            </Card>
        </section>
    );
}
