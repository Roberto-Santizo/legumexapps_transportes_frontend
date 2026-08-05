import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

export const VehicleSchema = z.object({
    id: z.number(),
    plate: z.string(),
    brand: z.string(),
    model: z.string(),
    year: z.number(),
    capacity: z.string(),
    type: z.string(),
    image: z.string(),
    status: z.string(),
    carrierName: z.string(),
});

export const PaginatedVehiclesSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(VehicleSchema)
});
