import type { LatLngPairSchema, PaginatedZonesSchema, ZoneSchema } from "@/features/zones/zones";
import type { z } from "zod";

/** Par [latitud, longitud]. La latitud va PRIMERO. */
export type LatLngPair = z.infer<typeof LatLngPairSchema>;
export type PaginatedZones = z.infer<typeof PaginatedZonesSchema>;
export type Zone = z.infer<typeof ZoneSchema>;

export type ZoneForm = {
    name: string;
    /** `null` borra la descripción; omitirla la deja como está. */
    description: string | null;
    /** Hex `#RRGGBB`. Nunca `null`: la API lo rechaza con 422. */
    color: string;
    area: LatLngPair[];
}
