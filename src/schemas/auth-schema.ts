import z from "zod";

const emailSchema = z.email("Invalid email address");
const PASSWORD_MIN_LENGTH = 8;
const passwordPolicySchema = z
    .string()
    .regex(
        new RegExp(
            `^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z\\d]).{${PASSWORD_MIN_LENGTH},}$`
        ),
        `Password must be at least ${PASSWORD_MIN_LENGTH} characters long and include uppercase, lowercase, number, and special character`
    );
const loginPasswordSchema = z
    .string()
    // Login should only validate presence, not composition rules.
    .min(1, "Password is required");
const newPasswordSchema = passwordPolicySchema;

export const registerSchema = z.object({
    name: z.string().min(4),
    email: emailSchema,
    password: passwordPolicySchema,
});

export const loginSchema = z.object({
    email: emailSchema,
    password: loginPasswordSchema,
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
