import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

export const FuelPriceSchema = z.object({
    id: z.number(),
    fuelType: z.string(),
    price: z.string(),
    status: z.string(),
    registeredByName: z.string(),
    createdAt: z.string(),
});

export const PaginatedFuelPricesSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(FuelPriceSchema)
});
