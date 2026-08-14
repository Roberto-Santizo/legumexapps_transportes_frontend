/**
 * Único punto del front donde se convierten coordenadas entre la API y Google
 * Maps, y donde se traduce un error del backend a un texto para el usuario.
 * Si aparece una conversión de lat/lng en cualquier otro archivo, está mal.
 */

import type { LatLngPair, ZoneForm } from "@/features/zones/zones";
import { isAxiosError } from "axios";

/** Azul por defecto de Leaflet: es el color con el que nace una zona sin color. */
export const ZONE_DEFAULT_COLOR = "#3388FF";

/** El backend no acepta menos de 3 vértices. */
export const ZONE_MIN_VERTICES = 3;

export const ZONE_HEX_PATTERN = /^#[0-9A-Fa-f]{6}$/;

/**
 * Una zona dada de baja no desaparece de la tabla: `status: false` la deja
 * visible pero fuera de uso, y se puede reactivar.
 */
export const ZONE_STATUS_LABELS: Record<'true' | 'false', string> = {
    true: "Activa",
    false: "Dada de baja",
};

/** Encuadre inicial cuando todavía no hay geometría que centrar. */
export const ZONE_MAP_DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 15.5, lng: -90.25 };
export const ZONE_MAP_DEFAULT_ZOOM = 7;

/** ~11 cm de precisión: suficiente para una zona y evita payloads absurdos. */
const COORDINATE_DECIMALS = 6;

/** API → Google Maps. */
export const toMapsPath = (area: LatLngPair[]): google.maps.LatLngLiteral[] =>
    area.map(([lat, lng]) => ({ lat, lng }));

/**
 * Google Maps → API, sin perder precisión. El redondeo se deja para
 * `roundArea` al armar el payload: si se redondeara aquí, el trazado que
 * devuelve el editor dejaría de coincidir con el del polígono y el mapa
 * reescribiría el anillo en mitad del arrastre de un vértice.
 */
export const fromMapsPath = (path: google.maps.LatLng[]): LatLngPair[] =>
    path.map((point) => [point.lat(), point.lng()]);

/** Recorta los decimales justo antes de enviar el polígono. */
export const roundArea = (area: LatLngPair[]): LatLngPair[] =>
    area.map(([lat, lng]) => [
        Number(lat.toFixed(COORDINATE_DECIMALS)),
        Number(lng.toFixed(COORDINATE_DECIMALS))
    ]);

/**
 * Deja el formulario en la forma que espera la API. Dos detalles que el
 * backend trata de forma asimétrica: una descripción en blanco viaja como
 * `null` —así se borra—, mientras que `color: null` devolvería un 422, de modo
 * que el hex siempre viaja. El nombre no se pasa a mayúsculas aquí: lo
 * normaliza el backend y se pinta lo que devuelve la respuesta.
 */
export const buildZonePayload = (form: ZoneForm): ZoneForm => {
    const description = form.description?.trim() ?? '';

    return {
        name: form.name.trim(),
        description: description.length > 0 ? description : null,
        color: form.color.toUpperCase(),
        area: roundArea(form.area)
    };
};

/** Rectángulo que contiene el trazado, para encuadrar el mapa. */
export const getAreaBounds = (area: LatLngPair[]): google.maps.LatLngBoundsLiteral | null => {
    if (area.length === 0) return null;

    const latitudes = area.map(([lat]) => lat);
    const longitudes = area.map(([, lng]) => lng);

    return {
        north: Math.max(...latitudes),
        south: Math.min(...latitudes),
        east: Math.max(...longitudes),
        west: Math.min(...longitudes),
    };
};

export const formatLatLng = ([lat, lng]: LatLngPair): string =>
    `${lat.toFixed(5)}, ${lng.toFixed(5)}`;

/**
 * Proyecta el anillo dentro de un cuadro de `size` px para dibujarlo como
 * miniatura en SVG. No es una conversión de coordenadas para la API: es la
 * silueta de la zona, que es lo que la distingue de un vistazo en la tabla.
 * Conserva la proporción y voltea la latitud, porque en pantalla el norte va
 * arriba y en SVG la `y` crece hacia abajo.
 */
export const toGlyphPoints = (area: LatLngPair[], size: number, padding = 2): string | null => {
    if (area.length < ZONE_MIN_VERTICES) return null;

    const bounds = getAreaBounds(area);

    if (!bounds) return null;

    const spanLat = bounds.north - bounds.south;
    const spanLng = bounds.east - bounds.west;
    const span = Math.max(spanLat, spanLng);

    if (span === 0) return null;

    const inner = size - padding * 2;
    const offsetX = (inner - (spanLng / span) * inner) / 2;
    const offsetY = (inner - (spanLat / span) * inner) / 2;

    return area
        .map(([lat, lng]) => {
            const x = padding + offsetX + ((lng - bounds.west) / span) * inner;
            const y = padding + offsetY + ((bounds.north - lat) / span) * inner;

            return `${x.toFixed(2)},${y.toFixed(2)}`;
        })
        .join(' ');
};

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 401/403/404 y el formato de validación de Laravel
 * `{ message, errors }` para el 422. En el 422 el `message` trae la coletilla
 * «(and 3 more errors)», así que se prefieren los mensajes de `errors`, que ya
 * vienen redactados en español y nombran el punto del polígono que falla.
 */
export const getZoneErrorMessage = (error: unknown): string => {
    if (!isAxiosError(error)) return "Error no controlado.";

    const data = error.response?.data;

    if (data && typeof data === 'object') {
        const { errors, message } = data as { errors?: unknown; message?: unknown };

        if (errors && typeof errors === 'object') {
            const messages = Object.values(errors as Record<string, unknown>)
                .flatMap((entry) => Array.isArray(entry) ? entry : [entry])
                .filter((entry): entry is string => typeof entry === 'string');

            if (messages.length > 0) return messages.join(' · ');
        }

        if (typeof message === 'string') return message;
    }

    return "Error no controlado.";
};
