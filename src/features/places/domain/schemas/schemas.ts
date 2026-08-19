import { z } from "zod";

/**
 * Una coincidencia de la búsqueda. Solo trae lo que hace falta para pintar la
 * lista: el `id` opaco de Google y la dirección ya formateada.
 */
export const PlacePredictionSchema = z.object({
    id: z.string(),
    formattedAddress: z.string(),
});

/**
 * El lugar resuelto. `latitude` y `longitude` llegan como número —no como
 * cadena—: son lo que devolvió Google, sin cast decimal de por medio.
 */
export const PlaceSchema = z.object({
    id: z.string(),
    formattedAddress: z.string(),
    latitude: z.number(),
    longitude: z.number(),
});

/**
 * La ruta por carretera hacia un destino registrado. `polyline` y `points` son
 * la misma línea en dos formatos: se consume una, no las dos.
 */
export const DirectionsSchema = z.object({
    locationId: z.number(),
    locationName: z.string(),
    distanceKilometers: z.number(),
    durationHours: z.number(),
    polyline: z.string(),
    points: z.array(z.tuple([z.number(), z.number()])),
});
