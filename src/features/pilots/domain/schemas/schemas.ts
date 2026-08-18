import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * `id` es el `user_id` del piloto, no el id de la fila pivote: el pivote no
 * sale nunca de la API. Es el único identificador con el que se puede ajustar
 * el salario o leer la bitácora.
 *
 * `salary` viaja como cadena con dos decimales y es MENSUAL en quetzales.
 * `null` significa «todavía no se le ha asignado», nunca cero: el backend
 * valida `min:0.01` justamente para que un `0.00` no se confunda con eso.
 */
export const PilotSchema = z.object({
    id: z.number(),
    name: z.string().nullable(),
    email: z.string().nullable(),
    carrierId: z.number(),
    carrierName: z.string().nullable(),
    salary: z.string().nullable(),
    /** Fecha en que se unió a la empresa. Formato `d-m-Y h:i:s A`, no ISO. */
    joinedAt: z.string().nullable(),
});

/**
 * Los metadatos se aplanan en la RAÍZ del sobre, no bajo `meta`. Sin `limit`
 * el backend responde la colección completa y no manda ninguno, así que los
 * tres son opcionales.
 */
export const PaginatedPilotsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(PilotSchema),
    lastPage: z.number().optional()
});

/**
 * Una entrada de la bitácora. `previousSalary` es `null` únicamente en la
 * primera asignación de cada piloto: la fila más antigua del historial y la
 * única que puede traerlo.
 */
export const PilotSalaryHistorySchema = z.object({
    id: z.number(),
    previousSalary: z.string().nullable(),
    newSalary: z.string(),
    changedById: z.number(),
    /** Nombre ACTUAL del autor, no una copia congelada del momento del cambio. */
    changedByName: z.string().nullable(),
    /** Formato `d-m-Y h:i:s A`, no ISO. No sirve para ordenar: el orden real es por `id`. */
    changedAt: z.string().nullable(),
});

export const PaginatedPilotSalaryHistorySchema = ApiPaginatedResponseSchema.extend({
    data: z.array(PilotSalaryHistorySchema),
    lastPage: z.number().optional()
});
