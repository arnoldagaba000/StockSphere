import z from "zod";

const emailSchema = z.email("Invalid email address");
const passwordSchema = z
    .string()
    .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
        "Password must be at least 8 characters long and include uppercase, lowercase, number, and special character"
    );
const newPasswordSchema = passwordSchema;

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
