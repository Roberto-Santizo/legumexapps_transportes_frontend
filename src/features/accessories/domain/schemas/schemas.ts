import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

export const AccessorySchema = z.object({
    id: z.number(),
    name: z.string(),
    code: z.string(),
    description: z.string().nullable(),
    /** Cadena con dos decimales, no número. */
    price: z.string(),
    /** Formato `d-m-Y`; el alta y la edición lo esperan en `Y-m-d`. */
    purchaseDate: z.string(),
    /** Porcentaje anual, en cadena: `"20.00"`. */
    annualDepreciation: z.string(),
    /** Derivado en cada lectura: cambia cada día sin que nadie escriba. Solo salida. */
    currentValue: z.string(),
    status: z.enum(['active', 'inactive', 'under_repair']),
    /** Nombre del administrador que lo dio de alta, no su id. */
    registeredBy: z.string().nullable(),
    /** Formato `d-m-Y h:i:s A`, no ISO 8601. */
    createdAt: z.string().nullable()
});

/**
 * Los metadatos de paginación llegan en la raíz del sobre. `lastPage` es propio
 * de este listado: el esquema compartido solo cubre `total`, `currentPage` y
 * `perPage`.
 */
export const PaginatedAccessoriesSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(AccessorySchema),
    lastPage: z.number().optional()
});
