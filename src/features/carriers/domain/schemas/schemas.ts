import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

export const CarrierSchema = z.object({
    id: z.number(),
    name: z.string(),
    image: z.string(),
    code: z.string(),
    active: z.boolean(),
});

export const PaginatedCarriersSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(CarrierSchema)
});
