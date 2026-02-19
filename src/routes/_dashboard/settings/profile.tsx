import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCurrentUserProfile } from "@/utils/functions/account-settings";
import { getUser } from "@/utils/functions/get-user";

export const Route = createFileRoute("/_dashboard/settings/profile")({
    component: ProfileSettingsPage,
    loader: () => getUser(),
});

function ProfileSettingsPage() {
    const router = useRouter();
    const { user } = Route.useLoaderData();
    const [name, setName] = useState(user.name);
    const [image, setImage] = useState(user.image ?? "");
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        try {
            setIsSaving(true);
            await updateCurrentUserProfile({
                data: {
                    image,
                    name,
                },
            });
            toast.success("Profile settings updated.");
            await router.invalidate();
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update profile settings.";
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-2xl space-y-4 rounded-lg border p-4">
            <div className="space-y-1">
                <h2 className="font-medium text-lg">Profile Settings</h2>
                <p className="text-muted-foreground text-sm">
                    Update your display name and profile image URL.
                </p>
            </div>

            <div className="space-y-2">
                <Label htmlFor="name">Display Name</Label>
                <Input
                    id="name"
                    onChange={(event) => setName(event.target.value)}
                    value={name}
                />
            </div>

            <div className="space-y-2">
                <Label htmlFor="image">Profile Picture URL</Label>
                <Input
                    id="image"
                    onChange={(event) => setImage(event.target.value)}
                    placeholder="https://example.com/avatar.jpg"
                    value={image}
                />
            </div>

            <Button disabled={isSaving} onClick={handleSave}>
                {isSaving ? "Saving..." : "Save Changes"}
            </Button>
        </div>
    );
}
