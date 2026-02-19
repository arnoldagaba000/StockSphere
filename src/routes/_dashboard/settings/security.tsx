import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { changeCurrentUserPassword } from "@/utils/functions/account-settings";

export const Route = createFileRoute("/_dashboard/settings/security")({
    component: SecuritySettingsPage,
});

function SecuritySettingsPage() {
    const [currentPassword, setCurrentPassword] = useState("");
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChangePassword = async () => {
        if (newPassword !== confirmPassword) {
            toast.error("New password and confirmation do not match.");
            return;
        }

        try {
            setIsSubmitting(true);
            await changeCurrentUserPassword({
                data: {
                    currentPassword,
                    newPassword,
                    revokeOtherSessions: true,
                },
            });
            toast.success("Password changed successfully.");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to change password.";
            toast.error(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-4 rounded-lg border p-4">
            <div className="space-y-1">
                <h2 className="font-medium text-lg">Security Settings</h2>
                <p className="text-muted-foreground text-sm">
                    Change your password. Other sessions will be revoked.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                    id="current-password"
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    type="password"
                    value={currentPassword}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                    id="new-password"
                    onChange={(event) => setNewPassword(event.target.value)}
                    type="password"
                    value={newPassword}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                    id="confirm-password"
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    type="password"
                    value={confirmPassword}
                />
            </div>

            <Button disabled={isSubmitting} onClick={handleChangePassword}>
                {isSubmitting ? "Updating..." : "Update Password"}
            </Button>
        </div>
    );
}
