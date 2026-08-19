import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Un destino puntual: la fila que cotizan las tarifas de flete. Lo ancla al
 * mundo real el `googlePlaceId`, no las coordenadas —esas solo pintan el pin—.
 *
 * `latitude` y `longitude` llegan como **cadena** con ocho decimales, no como
 * número: son un `decimal(10,8)` en la base y pasar por un float les quitaría
 * dígitos. Se muestran tal cual y solo se convierten para el mapa.
 */
export const LocationSchema = z.object({
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

export const PaginatedLocationsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(LocationSchema)
});
