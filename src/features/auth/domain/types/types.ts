import type { z } from "zod";
import type { LoginResponseSchema, UserSchema } from "@/features/auth/auth";

export type User = z.infer<typeof UserSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export type LoginForm = {
    email: string;
    password: string;
}

export type RegisterForm = {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    role: string;
}

export type ConfirmAccountForm = {
    email: string;
    code: string;
}