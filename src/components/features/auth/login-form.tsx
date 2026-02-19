import { revalidateLogic, useForm } from "@tanstack/react-form";
import { Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useTransition } from "react";
import toast from "react-hot-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import { loginSchema } from "@/schemas/auth-schema";
import AccountLinkingNote from "./account-linking-note";
import GoogleLogo from "./google-logo";

const LoginForm = () => {
    const navigate = useNavigate();
    const search = useSearch({ from: "/_auth/login" });
    const [isPending, startTransition] = useTransition();

    const handleLoginError = (message: string) => {
        if (message.toLowerCase().includes("ban")) {
            navigate({
                to: "/banned",
                search: {
                    reason: message,
                },
            });
            return;
        }

        toast.error(message);
    };

    const form = useForm({
        defaultValues: { email: "", password: "", rememberMe: false },
        onSubmit: ({ value }) => {
            startTransition(async () => {
                await authClient.signIn.email(
                    { ...value },
                    {
                        onSuccess: (ctx) => {
                            const displayName =
                                ctx.data.user?.name ?? ctx.data.user?.email;
                            navigate({
                                to: search.redirectTo ?? "/",
                                replace: true,
                            });
                            toast.success(`Welcome back, ${displayName}`);
                        },
                        onError: (ctx) => {
                            handleLoginError(ctx.error.message);
                        },
                    }
                );
            });
        },
        validators: { onSubmit: loginSchema },
        validationLogic: revalidateLogic({
            mode: "submit",
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
                    handleLoginError(error.message);
                },
            },
        });
    };

    const lastMethod = authClient.getLastUsedLoginMethod();

    return (
        <Card className="w-full max-w-sm md:max-w-md">
            <CardHeader className="text-center">
                <CardTitle className="text-xl">Welcome back</CardTitle>
                <CardDescription>
                    Login with your Google account
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
                        <Field>
                            <Button
                                className="relative"
                                onClick={handleGoogleSignIn}
                                type="button"
                                variant="outline"
                            >
                                <div className="flex items-center gap-2">
                                    <GoogleLogo />
                                    <span>Login with Google</span>
                                </div>

                                {lastMethod === "google" && (
                                    <Badge className="absolute -top-2 -right-1">
                                        Last used
                                    </Badge>
                                )}
                            </Button>
                        </Field>

                        <FieldSeparator className="*:data-[slot=field-separator-content]:bg-card">
                            Or continue with
                        </FieldSeparator>

                        <form.Field name="email">
                            {(field) => {
                                const isInvalid =
                                    field.state.meta.isTouched &&
                                    !field.state.meta.isValid;
                                return (
                                    <Field data-invalid={isInvalid}>
                                        <FieldLabel htmlFor="email">
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
                                            placeholder="Enter your email address"
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
                                        <div className="flex items-center">
                                            <FieldLabel htmlFor="password">
                                                Password
                                            </FieldLabel>

                                            <Link
                                                className="ml-auto text-sm underline-offset-4 hover:underline"
                                                to="/forgot-password"
                                            >
                                                Forgot your password?
                                            </Link>
                                        </div>

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

                        <form.Field name="rememberMe">
                            {(field) => (
                                <div className="flex items-center gap-2">
                                    <Checkbox
                                        checked={Boolean(field.state.value)}
                                        id={field.name}
                                        name={field.name}
                                        onCheckedChange={(val) =>
                                            field.handleChange(Boolean(val))
                                        }
                                    />

                                    <FieldLabel htmlFor={field.name}>
                                        Remember me
                                    </FieldLabel>
                                </div>
                            )}
                        </form.Field>

                        <form.Subscribe>
                            {(state) => (
                                <Field>
                                    <Button
                                        aria-busy={isPending}
                                        disabled={isPending || !state.canSubmit}
                                        type="submit"
                                    >
                                        {isPending ? "Logging in..." : "Login"}
                                    </Button>

                                    <FieldDescription className="text-center">
                                        Don&apos;t have an account?{" "}
                                        <Link to="/register">Sign up</Link>
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

export default LoginForm;
