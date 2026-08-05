import type { CarrierSchema, PaginatedCarriersSchema } from "@/features/carriers/carriers";
import type { z } from "zod";

export type PaginatedCarriers = z.infer<typeof PaginatedCarriersSchema>;
export type Carrier = z.infer<typeof CarrierSchema>;

export type CarrierForm = {
    name: string;
    image: File;
}
