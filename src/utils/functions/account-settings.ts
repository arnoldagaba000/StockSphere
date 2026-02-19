import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";
import { getRequestIpAddress, logActivity } from "@/lib/audit/activity-log";
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

interface ChangeEmailPayload {
    newEmail: string;
}

interface RevokeSessionPayload {
    token: string;
}

const MAX_PROFILE_IMAGE_BYTES = 2 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/gif",
] as const;

const PROFILE_IMAGE_DATA_URL_REGEX =
    /^data:(?<mime>image\/[a-z0-9.+-]+);base64,(?<data>[a-z0-9+/=]+)$/i;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_NUMBER_REGEX = /\d/;
const PASSWORD_SYMBOL_REGEX = /[^A-Za-z0-9]/;

const hashEmailForAudit = async (email: string): Promise<string> => {
    const bytes = new TextEncoder().encode(email);
    const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
    return Array.from(new Uint8Array(hashBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
};

const assertPasswordStrength = (password: string): void => {
    const minLength = 10;
    const hasUppercase = PASSWORD_UPPERCASE_REGEX.test(password);
    const hasLowercase = PASSWORD_LOWERCASE_REGEX.test(password);
    const hasNumber = PASSWORD_NUMBER_REGEX.test(password);
    const hasSymbol = PASSWORD_SYMBOL_REGEX.test(password);

    if (
        !(
            password.length >= minLength &&
            hasUppercase &&
            hasLowercase &&
            hasNumber &&
            hasSymbol
        )
    ) {
        throw new Error(
            "Password must be at least 10 characters and include uppercase, lowercase, number, and symbol."
        );
    }
};

const validateProfileImage = (image: string | null): void => {
    if (!image) {
        return;
    }

    if (image.startsWith("http://") || image.startsWith("https://")) {
        if (image.length > 2048) {
            throw new Error("Profile image URL is too long.");
        }

        return;
    }

    const match = PROFILE_IMAGE_DATA_URL_REGEX.exec(image);
    if (!match?.groups) {
        throw new Error(
            "Profile image must be an HTTP(S) URL or a valid uploaded image."
        );
    }

    const mimeType = match.groups.mime?.toLowerCase();
    if (
        !(
            mimeType &&
            ALLOWED_IMAGE_MIME_TYPES.includes(
                mimeType as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
            )
        )
    ) {
        throw new Error("Unsupported image type. Use JPG, PNG, WEBP, or GIF.");
    }

    const base64Data = match.groups.data ?? "";
    const bytes = Math.floor((base64Data.length * 3) / 4);
    if (bytes > MAX_PROFILE_IMAGE_BYTES) {
        throw new Error("Profile image must be 2MB or less.");
    }
};

export const updateCurrentUserProfile = createServerFn({ method: "POST" })
    .inputValidator((data: UpdateProfilePayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const headers = getRequestHeaders();
        const normalizedName = data.name.trim();
        const normalizedImage = data.image?.trim() ?? "";
        validateProfileImage(normalizedImage ? normalizedImage : null);

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

        await logActivity({
            action: "PROFILE_UPDATED",
            actorUserId: context.session.user.id,
            changes: {
                imageUpdated: Boolean(normalizedImage),
                name: normalizedName,
            },
            entity: "User",
            entityId: context.session.user.id,
            ipAddress: getRequestIpAddress(headers),
        });

        return { success: true };
    });

export const changeCurrentUserPassword = createServerFn({ method: "POST" })
    .inputValidator((data: ChangePasswordPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const headers = getRequestHeaders();

        if (!(data.currentPassword && data.newPassword)) {
            throw new Error("Both current and new passwords are required.");
        }
        assertPasswordStrength(data.newPassword);

        await auth.api.changePassword({
            body: {
                currentPassword: data.currentPassword,
                newPassword: data.newPassword,
                revokeOtherSessions: data.revokeOtherSessions,
            },
            headers,
        });

        await logActivity({
            action: "PASSWORD_CHANGED",
            actorUserId: context.session.user.id,
            changes: {
                revokeOtherSessions: data.revokeOtherSessions,
            },
            entity: "User",
            entityId: context.session.user.id,
            ipAddress: getRequestIpAddress(headers),
        });

        return { success: true };
    });

export const requestCurrentUserEmailChange = createServerFn({ method: "POST" })
    .inputValidator((data: ChangeEmailPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const headers = getRequestHeaders();
        const nextEmail = data.newEmail.trim().toLowerCase();
        if (!nextEmail) {
            throw new Error("New email is required.");
        }
        if (nextEmail === context.session.user.email.toLowerCase()) {
            throw new Error(
                "New email must be different from your current email."
            );
        }

        await auth.api.changeEmail({
            body: {
                callbackURL: "/settings/security",
                newEmail: nextEmail,
            },
            headers,
        });

        await logActivity({
            action: "EMAIL_CHANGE_REQUESTED",
            actorUserId: context.session.user.id,
            changes: {
                hasNewEmail: true,
                newEmailHash: await hashEmailForAudit(nextEmail),
            },
            entity: "User",
            entityId: context.session.user.id,
            ipAddress: getRequestIpAddress(headers),
        });

        return { success: true };
    });

export const listCurrentUserSessions = createServerFn({ method: "GET" })
    .middleware([authMiddleware])
    .handler(async ({ context }) => {
        const headers = getRequestHeaders();
        const sessions = await auth.api.listSessions({ headers });

        return {
            currentSessionToken: context.session.session.token,
            sessions,
        };
    });

export const revokeCurrentUserSession = createServerFn({ method: "POST" })
    .inputValidator((data: RevokeSessionPayload) => data)
    .middleware([authMiddleware])
    .handler(async ({ context, data }) => {
        const headers = getRequestHeaders();
        if (!data.token) {
            throw new Error("Session token is required.");
        }

        await auth.api.revokeSession({
            body: { token: data.token },
            headers,
        });

        await logActivity({
            action: "SESSION_REVOKED",
            actorUserId: context.session.user.id,
            changes: {
                targetToken: data.token.slice(-8),
            },
            entity: "Session",
            entityId: data.token,
            ipAddress: getRequestIpAddress(headers),
        });

        return { success: true };
    });
