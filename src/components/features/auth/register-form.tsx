import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Link, useNavigate } from "@tanstack/react-router";
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
    FieldSeparator,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth/client";
import { registerSchema } from "@/schemas/auth-schema";
import AccountLinkingNote from "./account-linking-note";
import GoogleLogo from "./google-logo";

const RegisterForm = () => {
    const navigate = useNavigate();
    const [isPending, startTransition] = useTransition();

    const form = useForm({
        defaultValues: { name: "", email: "", password: "" },
        onSubmit: ({ value }) => {
            startTransition(async () => {
                await authClient.signUp.email(
                    {
                        name: value.name,
                        email: value.email,
                        password: value.password,
                    },
                    {
                        onSuccess: (ctx) => {
                            const displayName =
                                ctx.data.user?.name ?? ctx.data.user?.email;
                            toast.success(`Welcome, ${displayName}`);
                            navigate({ to: "/", replace: true });
                        },
                        onError: (ctx) => {
                            toast.error(ctx.error.message);
                        },
                    }
                );
            });
        },
        validators: { onSubmit: registerSchema },
        validationLogic: revalidateLogic({
            mode: "change",
            modeAfterSubmission: "change",
        }),
    });

    const handleGoogleSignIn = () => {
        authClient.signIn.social({
            provider: "google",
            callbackURL: `${window.location.origin}`,
            fetchOptions: {
                onSuccess: (ctx) => {
                    const displayName =
                        ctx.data.user?.name ?? ctx.data.user?.email;
                    toast.success(`Welcome, ${displayName}`);
                },
                onError: ({ error }) => {
                    toast.error(error.message);
                },
            },
        });
    };

    return (
        <Card className="w-full max-w-sm md:max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-xl">Create your account</CardTitle>
                <CardDescription>
                    Fill in the form below to create your account
                </CardDescription>
            </CardHeader>

            <CardContent>
                <form
                    action={async () => {
                        await form.handleSubmit();
                    }}
                >
                    <FieldGroup>
                        <AccountLinkingNote />
                        <form.Field name="name">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid;

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>
                                            Full Name
                                        </FieldLabel>
                                        <Input
                                            disabled={form.state.isSubmitting}
                                            id={field.name}
                                            name={field.name}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter your full name"
                                            type="text"
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

                        <form.Field name="password">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid;

                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor={field.name}>
                                            Password
                                        </FieldLabel>

                                        <Input
                                            disabled={form.state.isSubmitting}
                                            id={field.name}
                                            name={field.name}
                                            onBlur={field.handleBlur}
                                            onChange={(e) =>
                                                field.handleChange(
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter your password"
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
                                            ? "Signing up..."
                                            : "Sign up"}
                                    </Button>
                                </Field>
                            )}
                        </form.Subscribe>

                        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                            Or continue with
                        </FieldSeparator>

                        <Field>
                            <Button
                                onClick={() => handleGoogleSignIn()}
                                type="button"
                                variant="outline"
                            >
                                <GoogleLogo />
                                Sign up with Google
                            </Button>
                        </Field>

                        <FieldDescription className="text-center">
                            Already have an account?{" "}
                            <Link to="/login">Sign in</Link>
                        </FieldDescription>
                    </FieldGroup>
                </form>
            </CardContent>
        </Card>
    );
};

export default RegisterForm;
