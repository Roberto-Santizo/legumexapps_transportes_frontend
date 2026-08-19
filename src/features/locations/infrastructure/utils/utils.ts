/**
 * Único punto del front donde se convierten las coordenadas de un destino
 * entre la API y Google Maps, y donde se traduce un error del backend a un
 * texto para el usuario. Si aparece un `Number(latitude)` en cualquier otro
 * archivo, está mal.
 */

import type { Location, LocationForm } from "@/features/locations/locations";
import { isAxiosError } from "axios";

/**
 * Un destino dado de baja no desaparece de la tabla: `status: false` lo deja
 * visible pero fuera de uso, y sus tarifas dejan de cotizar hasta reactivarlo.
 */
export const LOCATION_STATUS_LABELS: Record<'true' | 'false', string> = {
    true: "Activo",
    false: "Dado de baja",
};

/** Encuadre inicial cuando todavía no hay pin que centrar. */
export const LOCATION_MAP_DEFAULT_CENTER: google.maps.LatLngLiteral = { lat: 15.5, lng: -90.25 };
export const LOCATION_MAP_DEFAULT_ZOOM = 7;

/** Zoom con el que se abre el mapa sobre un destino ya ubicado. */
export const LOCATION_MAP_PIN_ZOOM = 16;

/**
 * Ocho decimales: lo que guarda la base (`decimal(10,8)`) y poco más de un
 * milímetro de precisión. Recortar más perdería dígitos que la API sí conserva.
 */
export const COORDINATE_DECIMALS = 8;

/** API → Google Maps. La cadena de ocho decimales solo se vuelve número aquí. */
export const toMapsPosition = (latitude: string | number, longitude: string | number): google.maps.LatLngLiteral => ({
    lat: Number(latitude),
    lng: Number(longitude),
});

/** Recorta los decimales justo antes de enviar el destino. */
export const roundCoordinate = (value: number): number => Number(value.toFixed(COORDINATE_DECIMALS));

/** Para leerlas de un vistazo en una tabla: cinco decimales bastan a escala de calle. */
export const formatCoordinates = (latitude: string | number, longitude: string | number): string =>
    `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;

/**
 * Deja el formulario en la forma que espera la API: una descripción en blanco
 * viaja como `null` —así se borra—, y el nombre no se pasa a mayúsculas aquí,
 * lo normaliza el backend y se pinta lo que devuelve la respuesta.
 */
export const buildLocationPayload = (form: LocationForm): LocationForm => {
    const description = form.description?.trim() ?? '';

    return {
        name: form.name.trim(),
        description: description.length > 0 ? description : null,
        googlePlaceId: form.googlePlaceId.trim(),
        latitude: roundCoordinate(Number(form.latitude)),
        longitude: roundCoordinate(Number(form.longitude)),
    };
};

/** Un destino sin lugar de Google no es válido: el `POST` responde 422. */
export const hasPlace = (form: Pick<LocationForm, 'googlePlaceId'>): boolean =>
    form.googlePlaceId.trim().length > 0;

/** Encuadre del mapa para un destino ya guardado. */
export const getLocationPosition = (location: Location): google.maps.LatLngLiteral =>
    toMapsPosition(location.latitude, location.longitude);

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de validación de Laravel
 * `{ message, errors }` para el 422. En el 422 el `message` trae la coletilla
 * «(and 3 more errors)», así que se prefieren los mensajes de `errors`, que ya
 * vienen redactados en español y nombran el campo que falla.
 */
export const getLocationErrorMessage = (error: unknown): string => {
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
