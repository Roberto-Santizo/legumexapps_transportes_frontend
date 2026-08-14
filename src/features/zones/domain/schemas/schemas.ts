import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * El par viaja como [latitud, longitud] —al revés que GeoJSON, Mapbox o turf—.
 * Invertirlo no siempre falla: si los dos valores son plausibles la zona se
 * guarda en el lugar equivocado sin error, así que el rango se valida aquí.
 */
export const LatLngPairSchema = z.tuple([
    z.number().min(-90).max(90),
    z.number().min(-180).max(180)
]);

export const ZoneSchema = z.object({
    id: z.number(),
    name: z.string(),
    description: z.string().nullable(),
    color: z.string(),
    /** Anillo abierto: el primer punto no se repite al final. Mínimo 3. */
    area: z.array(LatLngPairSchema),
    status: z.boolean(),
    registeredByName: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
});

export const PaginatedZonesSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(ZoneSchema)
});
