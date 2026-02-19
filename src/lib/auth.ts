import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { lastLoginMethod } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import { prisma } from "@/db";
import { sendEmail } from "@/lib/email";
import { createResetPasswordEmailTemplate } from "@/lib/email-templates";

export const auth = betterAuth({
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
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
        // haveIBeenPwned(),
        lastLoginMethod(),
        tanstackStartCookies(),
    ],
});

export type User = typeof auth.$Infer.Session.user;
export type Session = typeof auth.$Infer.Session.session;
