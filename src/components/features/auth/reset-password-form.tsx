import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Field,
    FieldDescription,
    FieldError,
    FieldGroup,
    FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";
import { resetPasswordSchema } from "@/schemas/auth-schema";

const ResetPasswordForm = () => {
    const navigate = useNavigate();
    const search = useSearch({ from: "/_auth/reset-password" });
    const [isPending, startTransition] = useTransition();

    const form = useForm({
        defaultValues: { password: "", confirmPassword: "" },
        onSubmit: ({ value }) => {
            startTransition(async () => {
                if (!search.token) {
                    toast.error(
                        search.error ??
                            "Missing reset token. Please request a new link."
                    );
                    return;
                }

                const { error } = await authClient.resetPassword({
                    token: search.token,
                    newPassword: value.password,
                });

                if (error) {
                    toast.error(error.message);
                    return;
                }

                toast.success("Password updated. Please sign in.");
                navigate({ to: "/login", replace: true });
            });
        },
        validators: { onSubmit: resetPasswordSchema },
        validationLogic: revalidateLogic({
            mode: "submit",
            modeAfterSubmission: "change",
        }),
    });

    return (
        <Card className="w-full max-w-sm md:max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-xl">Set a new password</CardTitle>
                <CardDescription>
                    Choose a strong password you haven&apos;t used before.
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        form.handleSubmit();
                    }}
                >
                    <FieldGroup>
                        <form.Field name="password">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>
                                            New Password
                                        </FieldLabel>
                                        <Input
                                            aria-invalid={isInvalid}
                                            disabled={form.state.isSubmitting}
                                            id={field.name}
                                            name={field.name}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter a new password"
                                            type="password"
                                            value={field.state.value}
                                        />

                                        {isInvalid && (
                                            <FieldError
                                                errors={field.state.meta.errors}
                                            />
                                        )}
                                    </Field>
                                );
                            }}
                        </form.Field>

                        <form.Field name="confirmPassword">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>
                                            Confirm Password
                                        </FieldLabel>
                                        <Input
                                            aria-invalid={isInvalid}
                                            disabled={form.state.isSubmitting}
                                            id={field.name}
                                            name={field.name}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Re-enter your password"
                                            type="password"
                                            value={field.state.value}
                                        />

                                        {isInvalid && (
                                            <FieldError
                                                errors={field.state.meta.errors}
                                            />
                                        )}
                                    </Field>
                                );
                            }}
                        </form.Field>

                        <form.Subscribe>
                            {(state) => (
                                <Field>
                                    <Button
                                        aria-busy={isPending}
                                        disabled={isPending || !state.canSubmit}
                                        type="submit"
                                    >
                                        {isPending
                                            ? "Updating..."
                                            : "Update password"}
                                    </Button>

                                    <FieldDescription className="text-center">
                                        {search.error ? (
                                            <span className="text-destructive">
                                                {search.error}
                                            </span>
                                        ) : (
                                            <span>
                                                Back to{" "}
                                                <Link to="/login">
                                                    Sign in
                                                </Link>
                                            </span>
                                        )}
                                    </FieldDescription>
                                </Field>
                            )}
                        </form.Subscribe>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
};

export default ResetPasswordForm;
