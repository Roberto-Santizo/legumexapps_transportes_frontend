import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Una empresa a la que Legumex presta servicio. Es el catálogo más pequeño del
 * proyecto: `code` y `name` son los dos únicos campos de negocio, no hay NIT,
 * ni dirección, ni contacto, y **no hay `status`** — un cliente existe o está
 * borrado, no se pausa.
 *
 * Las siete claves llegan siempre; las que no tienen valor viajan como `null`.
 *
 * `createdAt`, `updatedAt` y `deletedAt` vienen en `d-m-Y h:i:s A`, que **no es
 * ISO 8601**: `new Date(...)` sobre ellas devuelve `Invalid Date`. Se desarman
 * con los helpers de `infrastructure/utils`.
 *
 * `deletedAt` solo trae valor en la respuesta del propio `DELETE`: los otros
 * cuatro endpoints nunca alcanzan un cliente borrado, así que ahí es siempre
 * `null`. No sirve para descubrir clientes eliminados.
 */
export const ClientSchema = z.object({
    id: z.number(),
    /** MAYÚSCULAS, máx 15, sin ningún espacio. Lo teclea el administrador: no se autogenera. */
    code: z.string(),
    /** Razón social en MAYÚSCULAS y con los espacios internos colapsados, máx 255. */
    name: z.string(),
    /** Nombre ya resuelto de quien lo dio de alta. No se reescribe al editar. */
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
export const PaginatedClientsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(ClientSchema),
    lastPage: z.number().optional(),
});
