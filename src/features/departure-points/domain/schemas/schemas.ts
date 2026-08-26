import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * El punto **de donde sale** un viaje: bodega, planta, finca o centro de
 * acopio. No confundir con `Location`, que es a donde llega —son dos catálogos
 * con la misma forma exacta y secuencias de `id` independientes, así que un id
 * de aquí apunta a otra fila real allá y nadie avisa—. De un punto de partida
 * no cuelga ninguna tarifa de flete.
 *
 * `latitude` y `longitude` llegan como **cadena** con ocho decimales, no como
 * número: son un `decimal(10,8)` en la base y pasar por un float les quitaría
 * dígitos. Se muestran tal cual y solo se convierten para el mapa.
 */
export const DeparturePointSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    googlePlaceId: z.string(),
    latitude: z.string(),
    longitude: z.string(),
    status: z.boolean(),
    registeredByName: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
});

export const PaginatedDeparturePointsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(DeparturePointSchema)
});
