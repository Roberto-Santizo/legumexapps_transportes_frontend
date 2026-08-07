import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

export const ProductSchema = z.object({
    id: z.number(),
    name: z.string(),
    status: z.boolean(),
    registeredByName: z.string(),
    createdAt: z.string(),
    updatedAt: z.string(),
});

export const PaginatedProductsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(ProductSchema)
});
