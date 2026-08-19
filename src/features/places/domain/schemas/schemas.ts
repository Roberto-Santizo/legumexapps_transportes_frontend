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
