import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Link } from "@tanstack/react-router";
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
import { requestResetSchema } from "@/schemas/auth-schema";
import AccountLinkingNote from "./account-linking-note";

const ForgotPasswordForm = () => {
    const [isPending, startTransition] = useTransition();

    const form = useForm({
        defaultValues: { email: "" },
        onSubmit: ({ value }) => {
            startTransition(async () => {
                const { error } = await authClient.requestPasswordReset({
                    email: value.email,
                    redirectTo: `${window.location.origin}/reset-password`,
                });

                if (error) {
                    toast.error(
                        error?.message || "An error occurred. Please try again."
                    );
                    return;
                }

                toast.success("Check your email for a reset link.");
            });
        },
        validators: { onSubmit: requestResetSchema },
        validationLogic: revalidateLogic({
            mode: "submit",
            modeAfterSubmission: "change",
        }),
    });

    return (
        <Card className="w-full max-w-sm md:max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-xl">Reset your password</CardTitle>
                <CardDescription>
                    Enter your email and we&apos;ll send you a reset link.
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
                        <AccountLinkingNote />
                        <form.Field name="email">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>
                                            Email Address
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
                                            placeholder="Enter your email"
                                            type="email"
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
                                            ? "Sending..."
                                            : "Send reset link"}
                                    </Button>

                                    <FieldDescription className="text-center">
                                        Remembered your password?{" "}
                                        <Link to="/login">Sign in</Link>
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

export default ForgotPasswordForm;
