import z from "zod";

const emailSchema = z.email();
const passwordSchema = z.string();

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
