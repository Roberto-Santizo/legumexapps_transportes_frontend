import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Dieciséis claves y ninguna fecha: este dominio no expone `createdAt` ni
 * `updatedAt`. Los cuatro decimales (`capacity`, `kilometersPerGallon`,
 * `purchasePrice`, `monthlyInsuranceCost`) llegan como cadena por el casting
 * `decimal:2` del backend; `mileage` y `year` sí son enteros.
 *
 * `engineNumber` es la única de las columnas nuevas que admite `null`, y solo
 * en fichas anteriores a la migración: por la API nunca se llega a ese estado.
 */
export const VehicleSchema = z.object({
    id: z.number(),
    plate: z.string(),
    brand: z.string(),
    model: z.string(),
    year: z.number(),
    capacity: z.string(),
    type: z.string(),
    condition: z.string(),
    kilometersPerGallon: z.string(),
    purchasePrice: z.string(),
    monthlyInsuranceCost: z.string(),
    mileage: z.number(),
    engineNumber: z.string().nullable(),
    image: z.string().nullable(),
    status: z.string(),
    carrierName: z.string().nullable(),
});

/** Los metadatos de paginación se aplanan en la raíz del sobre, no bajo `meta`. */
export const PaginatedVehiclesSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(VehicleSchema),
    lastPage: z.number().optional()
});
