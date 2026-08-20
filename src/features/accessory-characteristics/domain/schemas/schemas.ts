import { ApiResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Seis claves, todas en camelCase. Ni `updatedAt`, ni `status`, ni el accesorio
 * embebido: `accessoryId` viaja como número suelto porque quien llega hasta
 * aquí ya tiene el accesorio —tuvo que mandar su id para pedir el listado—.
 *
 * `value` es **siempre** texto, aunque contenga «12» o «12/03/2024»: la API no
 * tipa los valores y no los ordena por valor.
 */
export const AccessoryCharacteristicSchema = z.object({
    id: z.number(),
    accessoryId: z.number(),
    /** Siempre en MAYÚSCULAS y con los espacios internos colapsados. Único dentro del accesorio. */
    name: z.string(),
    /** Con la capitalización que tecleó el usuario: solo se le recortan los extremos. */
    value: z.string(),
    /** Nombre de quien la capturó. El id del usuario no sale nunca por la API. */
    registeredBy: z.string(),
    /** Formato `d-m-Y h:i:s A`. **No es ISO 8601**: `new Date(...)` devuelve `Invalid Date`. */
    createdAt: z.string()
});

/**
 * El listado se pide **sin `limit`**, así que no pagina y el sobre no trae
 * `total`, `currentPage` ni `lastPage`. Lo normal es que un accesorio tenga un
 * puñado de características y quepan enteras en una respuesta.
 */
export const AccessoryCharacteristicListSchema = ApiResponseSchema.extend({
    data: z.array(AccessoryCharacteristicSchema)
});
