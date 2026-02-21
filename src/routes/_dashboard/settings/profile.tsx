import { createFileRoute, useRouter } from "@tanstack/react-router";
import { ImageIcon, UserCircle2Icon, UserRoundIcon } from "lucide-react";
import { type ChangeEvent, useState } from "react";
import toast from "react-hot-toast";
import UserAvatar from "@/components/layout/user-avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateCurrentUserProfile } from "@/utils/functions/account-settings";
import { getUser } from "@/utils/functions/get-user";

export const Route = createFileRoute("/_dashboard/settings/profile")({
    component: ProfileSettingsPage,
    loader: () => getUser(),
});

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;

const readFileAsDataUrl = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error("Failed to read image file."));
        reader.onload = () => {
            if (typeof reader.result === "string") {
                resolve(reader.result);
                return;
            }
            reject(new Error("Invalid image file."));
        };
        reader.readAsDataURL(file);
    });

function ProfileSettingsPage() {
    const router = useRouter();
    const { user } = Route.useLoaderData();
    const [name, setName] = useState(user.name);
    const [image, setImage] = useState<string | null>(user.image ?? null);
    const [imageUrlInput, setImageUrlInput] = useState<string>(
        user.image?.startsWith("http://") || user.image?.startsWith("https://")
            ? user.image
            : ""
    );
    const [isSaving, setIsSaving] = useState(false);

    const handleImageFileChange = async (
        event: ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) {
            return;
        }

        if (!file.type.startsWith("image/")) {
            toast.error("Please select a valid image file.");
            return;
        }

        if (file.size > MAX_PROFILE_IMAGE_BYTES) {
            toast.error("Image must be 2MB or less.");
            return;
        }

        try {
            const dataUrl = await readFileAsDataUrl(file);
            setImage(dataUrl);
            setImageUrlInput("");
        } catch (error) {
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to load selected image.";
            toast.error(message);
        }

        event.target.value = "";
    };

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
            setIsSaving(false);
        } catch (error) {
            setIsSaving(false);
            const message =
                error instanceof Error
                    ? error.message
                    : "Failed to update profile settings.";
            toast.error(message);
        }
    };

    return (
        <div className="space-y-4">
            <Card className="border border-border/70">
                <CardHeader className="pb-2">
                    <CardTitle className="flex items-center gap-2">
                        <UserCircle2Icon className="h-4 w-4 text-primary" />
                        Profile Settings
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-foreground/80 text-sm">
                        Update your display name and profile picture.
                    </p>

                    <div className="grid gap-4 lg:grid-cols-[1fr_1.2fr]">
                        <div className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-4">
                            <Label className="inline-flex items-center gap-2">
                                <ImageIcon className="h-4 w-4 text-chart-2" />
                                Profile Picture
                            </Label>
                            <div className="flex items-center gap-4">
                                <UserAvatar
                                    size="lg"
                                    user={{ ...user, image }}
                                />
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        accept="image/*"
                                        onChange={handleImageFileChange}
                                        type="file"
                                    />
                                    <Button
                                        disabled={image === null}
                                        onClick={() => {
                                            setImage(null);
                                            setImageUrlInput("");
                                        }}
                                        type="button"
                                        variant="outline"
                                    >
                                        Remove Picture
                                    </Button>
                                </div>
                            </div>
                            <p className="text-foreground/70 text-xs">
                                Upload from your computer (max 2MB), paste an
                                image URL, or remove your current picture.
                            </p>
                        </div>

                        <div className="space-y-3 rounded-lg border border-border/70 bg-background/60 p-4">
                            <div className="space-y-2">
                                <Label htmlFor="image-url">
                                    Profile Picture URL (Optional)
                                </Label>
                                <Input
                                    id="image-url"
                                    onChange={(event) => {
                                        const nextValue = event.target.value;
                                        setImageUrlInput(nextValue);
                                        setImage(nextValue ? nextValue : null);
                                    }}
                                    placeholder="https://example.com/avatar.jpg"
                                    type="url"
                                    value={imageUrlInput}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label
                                    className="inline-flex items-center gap-2"
                                    htmlFor="name"
                                >
                                    <UserRoundIcon className="h-4 w-4 text-chart-3" />
                                    Display Name
                                </Label>
                                <Input
                                    id="name"
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                    value={name}
                                />
                            </div>
                        </div>
                    </div>

                    <Button disabled={isSaving} onClick={handleSave}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
