import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { lastLoginMethod } from "better-auth/plugins";
import { admin } from "better-auth/plugins/admin";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "@/db";
import { sendEmail } from "@/lib/email/sender";
import {
    createChangeEmailVerificationTemplate,
    createResetPasswordEmailTemplate,
} from "@/lib/email/templates";
import { adminAccessControl, betterAuthAdminRoles } from "./admin-access";
import { DEFAULT_USER_ROLE, isSuperAdminEmail } from "./roles";
import { ensureSuperAdminRole } from "./super-admin";

/**
 * Application auth instance.
 *
 * Responsibilities:
 * - Configure auth providers and cookie integration.
 * - Ensure user role is always set on creation.
 * - Promote configured developer email to SUPER_ADMIN.
 */
export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    user: {
        additionalFields: {
            // Expose role in auth responses/session payloads.
            role: {
                type: "string",
                input: false,
                required: false,
                defaultValue: DEFAULT_USER_ROLE,
            },
        },
        changeEmail: {
            enabled: true,
            sendChangeEmailVerification: async ({ newEmail, url, user }) => {
                const template = createChangeEmailVerificationTemplate({
                    currentEmail: user.email,
                    newEmail,
                    recipientName: user.name,
                    verificationUrl: url,
                });

                await sendEmail({
                    to: user.email,
                    subject: template.subject,
                    text: template.text,
                    html: template.html,
                });
            },
            updateEmailWithoutVerification: false,
        },
    },
    databaseHooks: {
        user: {
            create: {
                before: (user) => {
                    const nextUser = { ...user };

                    if (typeof nextUser.email === "string") {
                        nextUser.role = isSuperAdminEmail(nextUser.email)
                            ? "SUPER_ADMIN"
                            : DEFAULT_USER_ROLE;
                    }

                    return Promise.resolve({
                        data: nextUser,
                    });
                },
                after: async () => {
                    await ensureSuperAdminRole();
                },
            },
        },
    },
    account: {
        accountLinking: {
            enabled: true,
            trustedProviders: ["google"],
        },
    },
    emailAndPassword: {
        enabled: true,
        sendResetPassword: async ({ user, url }) => {
            const template = createResetPasswordEmailTemplate({
                recipientName: user.name,
                resetUrl: url,
            });

            await sendEmail({
                to: user.email,
                subject: template.subject,
                text: template.text,
                html: template.html,
            });
        },
    },
    socialProviders: {
        google: {
            prompt: "select_account",
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
        },
    },
    plugins: [
        admin({
            ac: adminAccessControl,
            roles: betterAuthAdminRoles,
            adminRoles: ["ADMIN", "SUPER_ADMIN"],
            defaultRole: DEFAULT_USER_ROLE,
            allowImpersonatingAdmins: false,
        }),
        lastLoginMethod(),
        tanstackStartCookies(),
    ],
});

export type AuthUser = typeof auth.$Infer.Session.user;
export type AuthSession = typeof auth.$Infer.Session.session;
