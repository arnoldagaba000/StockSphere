import z from "zod";

const emailSchema = z.email();
const passwordSchema = z.string();
const newPasswordSchema = z.string().min(8);

export const registerSchema = z.object({
    name: z.string().min(4),
    email: emailSchema,
    password: passwordSchema,
});

export const loginSchema = z.object({
    email: emailSchema,
    password: passwordSchema,
    rememberMe: z.boolean(),
});

export const requestResetSchema = z.object({
    email: emailSchema,
});

export const resetPasswordSchema = z
    .object({
        password: newPasswordSchema,
        confirmPassword: newPasswordSchema,
    })
    .refine((data) => data.password === data.confirmPassword, {
        message: "Passwords do not match",
        path: ["confirmPassword"],
    });
