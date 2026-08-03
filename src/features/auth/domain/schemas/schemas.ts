import { z } from "zod";

export const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
});


export const LoginResponseSchema = z.object({
    user: UserSchema,
    token: z.string(),
});