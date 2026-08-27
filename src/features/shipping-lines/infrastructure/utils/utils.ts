/**
 * Único punto del front donde un error del backend de navieras se traduce a
 * texto para el usuario, donde se decide a qué campo se ancla y donde las
 * fechas dejan de ser la cadena `d-m-Y h:i:s A` que manda la API.
 *
 * Aquí se resuelve la trampa del dominio: **el duplicado de `name` llega como
 * 400 en `message`, no como 422 en `errors`**, al revés que en ubicaciones o
 * puntos de partida. Un formulario que solo leyera `errors` se lo comería en
 * silencio, así que el mapeo campo↔mensaje se hace a mano por el texto.
 */

import type { ShippingLineField, ShippingLineFilters, ShippingLineForm } from "@/features/shipping-lines/shipping-lines";
import { isAxiosError, type AxiosError } from "axios";

/** Límite que valida el backend. Se replica para no gastar un viaje en un 422. */
export const SHIPPING_LINE_NAME_MAX_LENGTH = 255;

/** Leer lo puede cualquier autenticado; crear, editar y borrar es solo de `administrator`. */
export const canWriteShippingLines = (role?: string): boolean => role === 'administrator';

/**
 * La normalización que hace el backend antes de guardar y antes de comparar la
 * unicidad: recorte, espacios internos colapsados y MAYÚSCULAS. Se replica para
 * comparar en el front —la coincidencia exacta del buscador previo al alta y lo
 * tecleado en la confirmación de borrado—; lo que se **pinta** siempre es lo
 * que devuelve la respuesta.
 */
export const normalizeShippingLineName = (value: string): string =>
    value.trim().replace(/\s+/g, ' ').toUpperCase();

/** Un filtro vacío no se manda: el backend lo ignora y solo ensucia la URL. */
export const buildShippingLineQuery = (limit: string, page: string, filters?: ShippingLineFilters): string => {
    const query = new URLSearchParams({ limit, page });

    if (filters?.search?.trim()) query.set('search', filters.search.trim());

    return query.toString();
};

/**
 * Lo que se envía al crear o editar. Una sola clave: cualquier otra se descarta
 * en el servidor. No se pasa a mayúsculas ni se colapsan los espacios aquí —lo
 * hace el backend— para que lo guardado sea siempre lo que él decide.
 */
export const buildShippingLinePayload = (form: ShippingLineForm): ShippingLineForm => ({
    name: form.name.trim(),
});

/**
 * `d-m-Y h:i:s A` de la API → `Date`. No es ISO 8601 y `Date` no lo parsea: se
 * desarma a mano para no depender del navegador.
 */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

export const parseShippingLineMoment = (value: string): Date | null => {
    const parts = MOMENT_PATTERN.exec(value.trim());

    if (!parts) return null;

    const [, day, month, year, rawHour, minute, second, meridiem] = parts;
    const hour = Number(rawHour) % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0);

    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second));

    return Number.isNaN(date.getTime()) ? null : date;
};

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit'
});

/** Si el texto no encaja con el formato de la API se pinta tal cual llegó. */
export const formatShippingLineMoment = (value: string, withTime = false): string => {
    const date = parseShippingLineMoment(value);

    if (!date) return value;

    return withTime
        ? `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`
        : dateFormatter.format(date);
};

/**
 * El error puede venir envuelto: el datasource lo relanza como `Error` con el
 * error de axios en `cause`, y así llega a la pantalla. Se desenvuelve hasta
 * encontrarlo para poder leer el `status` y el cuerpo originales.
 */
const toAxiosError = (error: unknown): AxiosError | null => {
    let current: unknown = error;

    for (let depth = 0; depth < 4 && current; depth++) {
        if (isAxiosError(current)) return current;

        current = current instanceof Error ? current.cause : null;
    }

    return null;
};

/**
 * Prefijo literal del 400 de duplicado. El mensaje completo sigue con la
 * coletilla «que puede haber sido eliminada», que **no es palabrería**: el
 * ocupante del nombre puede ser una fila invisible en todos los endpoints, y es
 * la única pista que tiene el usuario. Se muestra íntegro.
 */
export const SHIPPING_LINE_DUPLICATE_MESSAGE = "Ya existe una naviera con ese nombre";

/** El 400 que responden `PATCH` y `DELETE` sobre una naviera ya borrada. */
export const SHIPPING_LINE_ALREADY_DELETED_MESSAGE = "La naviera ya fue eliminada";

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de Laravel
 * `{ message, errors }` para el 422. En el 422 se prefieren los mensajes de
 * `errors`, que ya vienen en español y nombran el campo que falla.
 */
export const getShippingLineErrorMessage = (error: unknown): string => {
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

export type ShippingLineFieldError = {
    field: ShippingLineField;
    message: string;
}

/**
 * Ancla el error al único campo del formulario. Cubre las **dos** formas del
 * backend:
 *
 * - **422**: el mensaje llega en `errors.name`, con la clave en camelCase tal
 *   como se envió.
 * - **400**: el duplicado llega suelto en `message` y hay que reconocerlo por
 *   el texto.
 *
 * Devuelve vacío para lo que no pertenece al campo (403, 404, «ya fue
 * eliminada»): eso se muestra como notificación.
 */
export const getShippingLineFieldErrors = (error: unknown): ShippingLineFieldError[] => {
    const axiosError = toAxiosError(error);
    const data = axiosError?.response?.data;

    if (!data || typeof data !== 'object') return [];

    const { errors, message } = data as { errors?: unknown; message?: unknown };

    if (errors && typeof errors === 'object') {
        const entry = (errors as Record<string, unknown>).name;
        const first = (Array.isArray(entry) ? entry : [entry])
            .find((value): value is string => typeof value === 'string');

        if (first) return [{ field: 'name', message: first }];
    }

    if (typeof message !== 'string') return [];

    return message.startsWith(SHIPPING_LINE_DUPLICATE_MESSAGE)
        ? [{ field: 'name', message }]
        : [];
};
