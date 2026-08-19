import type { Directions } from "@/features/places/places";

/** Google no responde por debajo de este umbral: el backend corta con 422. */
export const PLACE_MIN_SEARCH_LENGTH = 3;

/** Espera entre pulsaciones antes de salir a buscar. Cada llamada se factura. */
export const PLACE_SEARCH_DEBOUNCE_MS = 400;

/** Único punto del front que conoce el código HTTP de un fallo de la ruta. */
export class DirectionsError extends Error {
    constructor(message: string, readonly status: number) {
        super(message);
        this.name = 'DirectionsError';
    }
}

/** `1.75` → `"1 h 45 min"`. Nunca se muestra "1,75 horas". */
export const formatDurationHours = (hours: number): string => {
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours % 1) * 60);

    if (wholeHours === 0) return `${minutes} min`;
    if (minutes === 0) return `${wholeHours} h`;

    return `${wholeHours} h ${minutes} min`;
};

/** `104.32` → `"104.32 km"`. */
export const formatDistanceKilometers = (kilometers: number): string => `${kilometers.toFixed(2)} km`;

/** `[[lat, lng], …]` → `[{ lat, lng }, …]`. El orden de origen es [latitud, longitud]. */
export const toRoutePath = (points: Directions['points']): google.maps.LatLngLiteral[] =>
    points.map(([lat, lng]) => ({ lat, lng }));
