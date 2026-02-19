import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import ResetPasswordForm from "@/components/features/auth/reset-password-form";

const searchSchema = z.object({
    token: z.string().optional(),
    error: z.string().optional(),
});

export const Route = createFileRoute("/_auth/reset-password")({
    component: ResetPasswordPage,
    validateSearch: searchSchema,
});

function ResetPasswordPage() {
    return <ResetPasswordForm />;
}
