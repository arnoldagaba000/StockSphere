import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { auth } from "@/lib/auth/config";
import { authMiddleware } from "@/middleware/auth";

interface UpdateProfilePayload {
    image: string | null;
    name: string;
}

interface ChangePasswordPayload {
    currentPassword: string;
    newPassword: string;
    revokeOtherSessions: boolean;
}

export const updateCurrentUserProfile = createServerFn({ method: "POST" })
    .inputValidator((data: UpdateProfilePayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ data }) => {
        const headers = getRequestHeaders();
        const normalizedName = data.name.trim();
        const normalizedImage = data.image?.trim() ?? "";

        if (!normalizedName) {
            throw new Error("Name is required.");
        }

        await auth.api.updateUser({
            body: {
                image: normalizedImage ? normalizedImage : null,
                name: normalizedName,
            },
            headers,
        });

        return { success: true };
    });

export const changeCurrentUserPassword = createServerFn({ method: "POST" })
    .inputValidator((data: ChangePasswordPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ data }) => {
        const headers = getRequestHeaders();

        if (!(data.currentPassword && data.newPassword)) {
            throw new Error("Both current and new passwords are required.");
        }

        await auth.api.changePassword({
            body: {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                revokeOtherSessions: data.revokeOtherSessions,
            },
            headers,
        });

        return { success: true };
    });
