import type { PaginatedVehiclesSchema, VehicleSchema } from "@/features/vehicles/vehicles";
import type { z } from "zod";

export type PaginatedVehicles = z.infer<typeof PaginatedVehiclesSchema>;
export type Vehicle = z.infer<typeof VehicleSchema>;

export type VehicleForm = {
    plate: string;
    brand: string;
    model: string;
    year: number;
    capacity: number;
    type: string;
    image: File;
    /** Solo se edita: al crear, el backend registra la unidad como `active`. */
    status?: string;
}
