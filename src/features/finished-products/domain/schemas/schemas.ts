import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Un SKU: la presentación empacada de un cliente. **No tiene relación con
 * `products`** (la mercancía que cotiza flete): comparten la palabra, no el
 * dominio.
 *
 * Las once claves llegan siempre; las que no tienen valor viajan como `null`.
 * `presentation` y `boxesPerPallet` se envían como número pero **vuelven como
 * string con dos decimales** (`"10.00"`). Las fechas vienen en
 * `d-m-Y h:i:s A`, no en ISO 8601.
 *
 * `deletedAt` solo trae valor en la respuesta del propio `DELETE`.
 */
export const FinishedProductSchema = z.object({
    id: z.number(),
    /** MAYÚSCULAS, máx 15, sin ningún espacio. Único para siempre, aunque se borre. */
    code: z.string(),
    /** MAYÚSCULAS, tal cual se tecleó (sin recorte ni colapso de espacios). No es único. */
    name: z.string(),
    presentation: z.string(),
    boxesPerPallet: z.string(),
    /** Puede apuntar a un cliente borrado después del alta. */
    clientId: z.number(),
    /** Sale aunque el cliente esté borrado. */
    clientName: z.string().nullable(),
    registeredByName: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
    deletedAt: z.string().nullable(),
});

/** Metadatos en la raíz del sobre y solo con un `limit` numérico. */
export const PaginatedFinishedProductsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(FinishedProductSchema),
    lastPage: z.number().optional(),
});
