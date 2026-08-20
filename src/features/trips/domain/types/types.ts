/** El payload del `POST /trips`. Un solo campo, a propósito. */
export type TripForm = {
    /** La polilínea codificada que devolvió `/api/places/directions`. */
    polyline: string;
}

/**
 * El estado del formulario. Origen y destino se validan con react-hook-form
 * pero NO viajan al servidor: `buildTripPayload` los descarta.
 */
export type TripFormValues = TripForm & {
    /** Id opaco de Google del punto de partida. Ancla el origen a un lugar real. */
    originGooglePlaceId: string;
    originLatitude: number;
    originLongitude: number;
    /** Id de la tabla `locations`. `null` mientras no se elige destino. */
    locationId: number | null;
}
