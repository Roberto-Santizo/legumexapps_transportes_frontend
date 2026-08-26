import type { DeparturePointSchema, PaginatedDeparturePointsSchema } from "@/features/departure-points/departure-points";
import type { z } from "zod";

export type PaginatedDeparturePoints = z.infer<typeof PaginatedDeparturePointsSchema>;
export type DeparturePoint = z.infer<typeof DeparturePointSchema>;

export type DeparturePointForm = {
    name: string;
    /** `null` borra la descripción; omitirla la deja como está. */
    description: string | null;
    /** Id opaco de Google (`ChIJ...`). Obligatorio y único: dos puntos de partida no pueden apuntar al mismo lugar. */
    googlePlaceId: string;
    /** Viajan como número en el payload; la API las devuelve como cadena. */
    latitude: number;
    longitude: number;
}
