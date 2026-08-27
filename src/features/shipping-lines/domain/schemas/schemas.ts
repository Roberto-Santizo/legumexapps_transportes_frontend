import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Una naviera del catálogo nacional. Es el dominio más pequeño del proyecto:
 * `name` es su **único** campo de negocio —no hay código, ni sigla, ni
 * contacto, ni puertos— y tampoco hay `status`, así que una naviera existe o
 * está borrada, no se pausa.
 *
 * Las seis claves llegan siempre; las que no tienen valor viajan como `null`.
 *
 * `createdAt`, `updatedAt` y `deletedAt` vienen en `d-m-Y h:i:s A`, que **no es
 * ISO 8601**: `new Date(...)` sobre ellas devuelve `Invalid Date`. Se desarman
 * con los helpers de `infrastructure/utils`.
 *
 * `deletedAt` solo trae valor en la respuesta del propio `DELETE`: los otros
 * cuatro endpoints nunca alcanzan una naviera borrada. No sirve para descubrir
 * navieras eliminadas —no existe ningún parámetro que las liste—.
 */
export const ShippingLineSchema = z.object({
    id: z.number(),
    /**
     * MAYÚSCULAS, espacios internos colapsados, máx 255. Único **global y
     * permanente**: una naviera borrada lo sigue ocupando. Es lo único por lo
     * que se identifica y lo único que barre el filtro `search`.
     */
    name: z.string(),
    /** Nombre ya resuelto de quien la dio de alta. No se reescribe al editar. */
    registeredByName: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
    deletedAt: z.string().nullable(),
});

/**
 * Los metadatos de paginación llegan **en la raíz** del sobre, no bajo `meta`,
 * y solo cuando se manda un `limit` numérico. `lastPage` es propio de este
 * dominio, así que se añade al sobre compartido.
 */
export const PaginatedShippingLinesSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(ShippingLineSchema),
    lastPage: z.number().optional(),
});
