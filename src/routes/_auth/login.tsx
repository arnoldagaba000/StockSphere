import { createFileRoute } from "@tanstack/react-router";
import z from "zod";
import LoginForm from "@/components/features/auth/login-form";

const searchSchema = z.object({
    redirectTo: z.string().optional(),
});

export const Route = createFileRoute("/_auth/login")({
    component: LoginPage,
    validateSearch: searchSchema,
});

function LoginPage() {
    return <LoginForm />;
}
