import { ApiResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Una línea de producto terminado de un viaje: cuántas cajas de un SKU del
 * cliente lleva. Diez claves, siempre.
 *
 * `code`, `name`, `presentation` y `boxesPerPallet` se leen **en vivo** del
 * producto terminado: si alguien lo edita, cambia lo que muestran todos los
 * viajes que lo llevan, también los finalizados. Si el producto se borra, la
 * línea sigue saliendo sin ninguna marca.
 *
 * `presentation` y `boxesPerPallet` son **cadenas** de dos decimales; `boxes`
 * es entero. `createdAt` viene en `d-m-Y h:i:s A`, no ISO. No hay `updatedAt`.
 */
export const TripFinishedProductSchema = z.object({
    /** Id de la **línea**, no del producto: es el de `PATCH` y `DELETE`. */
    id: z.number(),
    tripId: z.number(),
    finishedProductId: z.number(),
    code: z.string(),
    name: z.string(),
    presentation: z.string(),
    boxesPerPallet: z.string(),
    boxes: z.number(),
    registeredByName: z.string().nullable(),
    createdAt: z.string(),
});

/** El listado **nunca pagina**: sin `total`/`currentPage`, orden `id ASC`. */
export const TripFinishedProductsSchema = ApiResponseSchema.extend({
    data: z.array(TripFinishedProductSchema),
});
