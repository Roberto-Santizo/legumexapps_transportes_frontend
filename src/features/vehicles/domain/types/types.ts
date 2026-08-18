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
    /** Cómo se adquirió la unidad (`new` / `used`). No tiene nada que ver con `status`. */
    condition: string;
    kilometersPerGallon: number;
    purchasePrice: number;
    monthlyInsuranceCost: number;
    /**
     * Solo un `administrator` puede moverlo: si un `carrier` lo manda con un
     * valor distinto al guardado, el backend aborta el PATCH entero con 403.
     * Por eso en edición se omite salvo que el rol pueda tocarlo.
     */
    mileage?: number;
    engineNumber: string;
    image: File;
    /** Solo se edita: al crear, el backend registra la unidad como `active`. */
    status?: string;
}

/** Filtros del listado. Todos opcionales y todos tolerantes en el backend. */
export type VehicleFilters = {
    status?: string;
    /** Solo lo honra un `administrator`; a un `carrier` se le ignora en silencio. */
    carrierId?: string;
    /** Coincidencia exacta (`new` / `used`). */
    condition?: string;
    /** Coincidencia parcial e insensible a mayúsculas. */
    engineNumber?: string;
}
