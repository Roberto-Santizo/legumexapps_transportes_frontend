import type { LocationSchema, LocationTypeSchema, PaginatedLocationsSchema } from "@/features/locations/locations";
import type { z } from "zod";

export type PaginatedLocations = z.infer<typeof PaginatedLocationsSchema>;
export type Location = z.infer<typeof LocationSchema>;
/** Cadena cruda del enum, en inglés: se traduce solo al pintarla. */
export type LocationType = z.infer<typeof LocationTypeSchema>;

export type LocationForm = {
    name: string;
    /** `null` borra la descripción; omitirla la deja como está. */
    description: string | null;
    /**
     * Obligatorio en el alta desde el cambio incompatible: sin él la API
     * responde 422. No tiene valor por defecto a propósito —el que lo da de
     * alta elige— y en la edición es donde se reclasifican los puertos viejos.
     */
    type: LocationType;
    /** Id opaco de Google (`ChIJ...`). Obligatorio y único: dos destinos no pueden apuntar al mismo lugar. */
    googlePlaceId: string;
    /** Viajan como número en el payload; la API las devuelve como cadena. */
    latitude: number;
    longitude: number;
}
