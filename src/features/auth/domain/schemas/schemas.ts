import { z } from "zod";

export const UserSchema = z.object({
    id: z.number(),
    name: z.string(),
    email: z.string(),
    role: z.string(),
    carrierId: z.number().nullable(),
    carrierName: z.string().nullable(),
    carrierCode: z.string().nullable(),
});


export const LoginResponseSchema = z.object({
    user: UserSchema,
    token: z.string(),
});