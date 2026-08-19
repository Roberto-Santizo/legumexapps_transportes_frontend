import type { LocationSchema, PaginatedLocationsSchema } from "@/features/locations/locations";
import type { z } from "zod";

export type PaginatedLocations = z.infer<typeof PaginatedLocationsSchema>;
export type Location = z.infer<typeof LocationSchema>;

export type LocationForm = {
    name: string;
    /** `null` borra la descripción; omitirla la deja como está. */
    description: string | null;
    /** Id opaco de Google (`ChIJ...`). Obligatorio y único: dos destinos no pueden apuntar al mismo lugar. */
    googlePlaceId: string;
    /** Viajan como número en el payload; la API las devuelve como cadena. */
    latitude: number;
    longitude: number;
}
