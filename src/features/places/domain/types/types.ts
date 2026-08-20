import type { DirectionsSchema, PlacePredictionSchema, PlaceSchema } from "@/features/places/places";
import type { z } from "zod";

export type PlacePrediction = z.infer<typeof PlacePredictionSchema>;
export type Place = z.infer<typeof PlaceSchema>;
export type Directions = z.infer<typeof DirectionsSchema>;

/** Los tres parámetros de `/directions`. Los tres obligatorios, sin defaults. */
export type DirectionsQuery = {
    /** Id entero de la tabla `locations`. NO es un `placeId`. */
    locationId: number;
    /** Latitud del origen, entre -90 y 90. */
    latitude: number;
    /** Longitud del origen, entre -180 y 180. */
    longitude: number;
};
