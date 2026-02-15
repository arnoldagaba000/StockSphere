import { revalidateLogic, useForm } from "@tanstack/react-form";
import { useNavigate } from "@tanstack/react-router";
import toast from "react-hot-toast";
import { authClient } from "@/lib/auth-client";
import { loginSchema } from "@/schemas/auth-schema";

const LoginPage = () => {
    const navigate = useNavigate();

    const form = useForm({
        defaultValues: { email: "", password: "", rememberMe: false },
        onSubmit: async ({ value }) => {
            await authClient.signIn.email(
                { ...value },
                {
                    onSuccess: (ctx) => {
                        navigate({ to: "/dashboard", replace: true });
                        toast.success(`Welcome back, ${ctx.data.user.name}`);
                    },
                    onError: (ctx) => {
                        toast.error(ctx.error.message);
                    },
                }
            );
        },
        validators: { onSubmit: loginSchema },
        validationLogic: revalidateLogic({
            mode: "submit",
            modeAfterSubmission: "change",
        }),
    });

    return <div>LoginPage</div>;
};

export default LoginPage;
