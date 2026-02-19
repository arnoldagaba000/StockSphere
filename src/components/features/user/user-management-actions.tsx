import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmActionButton from "./confirm-action-button";

interface UserManagementActionsProps {
    canImpersonate: boolean;
    disabled: boolean;
    isBanned: boolean;
    isCurrentUser: boolean;
    isManageable: boolean;
    onBan: () => Promise<void>;
    onDelete: () => Promise<void>;
    onImpersonate: () => Promise<void>;
    onRevokeSessions: () => Promise<void>;
    onUnban: () => Promise<void>;
    userName: string;
}

const UserManagementActions = ({
    canImpersonate,
    disabled,
    isBanned,
    isCurrentUser,
    isManageable,
    onBan,
    onDelete,
    onImpersonate,
    onRevokeSessions,
    onUnban,
    userName,
}: UserManagementActionsProps) => {
    const isActionDisabled = disabled || !isManageable;

    return (
        <div className="flex justify-end gap-2">
            {isBanned ? (
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                disabled={isActionDisabled || isCurrentUser}
                                onClick={() => onUnban()}
                                size="sm"
                                variant="outline"
                            >
                                Unban
                            </Button>
                        }
                    />
                    <TooltipContent>
                        Restore account access for this user.
                    </TooltipContent>
                </Tooltip>
            ) : (
                <Tooltip>
                    <TooltipTrigger
                        render={
                            <Button
                                disabled={isActionDisabled || isCurrentUser}
                                onClick={() => onBan()}
                                size="sm"
                                variant="outline"
                            >
                                Ban
                            </Button>
                        }
                    />
                    <TooltipContent>
                        Block this user from signing in.
                    </TooltipContent>
                </Tooltip>
            )}

            <ConfirmActionButton
                confirmDescription={`This will force ${userName} to sign in again on all devices.`}
                confirmTitle="Revoke all sessions?"
                disabled={isActionDisabled || isCurrentUser}
                label="Revoke Sessions"
                onConfirm={onRevokeSessions}
                tooltip="Sign this user out from all active sessions."
            />

            {canImpersonate ? (
                <ConfirmActionButton
                    confirmDescription={`You will act as ${userName} until you stop impersonating.`}
                    confirmTitle="Start impersonation?"
                    disabled={isActionDisabled || isCurrentUser}
                    label="Impersonate"
                    onConfirm={onImpersonate}
                    tooltip="Temporarily access the app as this user."
                />
            ) : null}

            <ConfirmActionButton
                confirmDescription={`This will permanently delete ${userName}'s account.`}
                confirmTitle="Delete user permanently?"
                disabled={isActionDisabled || isCurrentUser}
                label="Delete"
                onConfirm={onDelete}
                tooltip="Permanently remove this user account."
                variant="destructive"
            />
        </div>
    );
};

export default UserManagementActions;
