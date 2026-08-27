/**
 * Único punto del front donde un error del backend de clientes se traduce a
 * texto para el usuario, donde se decide a qué campo se ancla y donde las
 * fechas dejan de ser la cadena `d-m-Y h:i:s A` que manda la API.
 *
 * Aquí se resuelve la trampa del dominio: **los duplicados de `code` y `name`
 * llegan como 400 en `message`, no como 422 en `errors`**, al revés que en los
 * otros catálogos. Un formulario que solo leyera `errors` se los comería en
 * silencio, así que el mapeo campo↔mensaje se hace a mano por el texto.
 */

import type { ClientField, ClientFilters, ClientForm } from "@/features/clients/clients";
import { isAxiosError, type AxiosError } from "axios";

/** Límites que valida el backend. Se replican para no gastar un viaje en un 422. */
export const CLIENT_CODE_MAX_LENGTH = 15;
export const CLIENT_NAME_MAX_LENGTH = 255;

/**
 * El `code` no admite **ningún** espacio ni tabulador, ni siquiera interior, y
 * la API lo rechaza en vez de corregirlo: `"CLI 001"` es un 422, no un
 * `"CLI001"` guardado. Se comprueba antes de enviar.
 */
export const CLIENT_CODE_PATTERN = /^\S+$/;

/** Leer lo puede cualquier autenticado; crear, editar y borrar es solo de `administrator`. */
export const canWriteClients = (role?: string): boolean => role === 'administrator';

/**
 * La normalización que hace el backend con el código: recorte y MAYÚSCULAS.
 * Se replica solo para comparar lo que el usuario teclea en la confirmación de
 * borrado; lo que se **pinta** siempre es lo que devuelve la respuesta.
 */
export const normalizeClientCode = (value: string): string => value.trim().toUpperCase();

/** Un filtro vacío no se manda: el backend lo ignora y solo ensucia la URL. */
export const buildClientQuery = (limit: string, page: string, filters?: ClientFilters): string => {
    const query = new URLSearchParams({ limit, page });

    if (filters?.search?.trim()) query.set('search', filters.search.trim());

    return query.toString();
};

/**
 * Lo que se envía al crear o editar. Solo dos claves: cualquier otra se
 * descarta en el servidor. No se pasa a mayúsculas aquí —lo hace el backend— y
 * el `code` no se limpia de espacios interiores a propósito: corregirlo en
 * silencio escondería un error de captura que la API sí señala.
 */
export const buildClientPayload = (form: ClientForm): ClientForm => ({
    code: form.code.trim(),
    name: form.name.trim(),
});

/**
 * `d-m-Y h:i:s A` de la API → `Date`. No es ISO 8601 y `Date` no lo parsea: se
 * desarma a mano para no depender del navegador.
 */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

export const parseClientMoment = (value: string): Date | null => {
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
export const formatClientMoment = (value: string, withTime = false): string => {
    const date = parseClientMoment(value);

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
 * Prefijos literales de los dos 400 de duplicado. El mensaje completo sigue con
 * la coletilla «que puede haber sido eliminado», que no es palabrería: el
 * ocupante del código puede ser una fila invisible en todos los endpoints.
 */
const DUPLICATE_MESSAGES: Record<ClientField, string> = {
    code: "Ya existe un cliente con ese código",
    name: "Ya existe un cliente con ese nombre",
};

/** El 400 que responden `PATCH` y `DELETE` sobre un cliente ya borrado. */
export const CLIENT_ALREADY_DELETED_MESSAGE = "El cliente ya fue eliminado";

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de Laravel
 * `{ message, errors }` para el 422. En el 422 se prefieren los mensajes de
 * `errors`, que ya vienen en español y nombran el campo que falla.
 */
export const getClientErrorMessage = (error: unknown): string => {
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

export type ClientFieldError = {
    field: ClientField;
    message: string;
}

/**
 * Reparte el error entre los dos campos del formulario. Cubre las **dos**
 * formas del backend:
 *
 * - **422**: los mensajes llegan en `errors`, con la clave en camelCase tal
 *   como se envió (`code`, `name`).
 * - **400**: el duplicado llega suelto en `message` y hay que reconocerlo por
 *   el texto. Si el código y el nombre están ocupados a la vez solo viene el
 *   del código —se comprueba primero—, así que el usuario corrige, reenvía y
 *   entonces ve el segundo.
 *
 * Devuelve vacío para lo que no pertenece a un campo (403, 404, «ya fue
 * eliminado»): eso se muestra como notificación.
 */
export const getClientFieldErrors = (error: unknown): ClientFieldError[] => {
    const axiosError = toAxiosError(error);
    const data = axiosError?.response?.data;

    if (!data || typeof data !== 'object') return [];

    const { errors, message } = data as { errors?: unknown; message?: unknown };

    if (errors && typeof errors === 'object') {
        const collected = (Object.keys(DUPLICATE_MESSAGES) as ClientField[]).flatMap((field) => {
            const entry = (errors as Record<string, unknown>)[field];
            const first = (Array.isArray(entry) ? entry : [entry])
                .find((value): value is string => typeof value === 'string');

            return first ? [{ field, message: first }] : [];
        });

        if (collected.length > 0) return collected;
    }

    if (typeof message !== 'string') return [];

    const duplicated = (Object.keys(DUPLICATE_MESSAGES) as ClientField[])
        .find((field) => message.startsWith(DUPLICATE_MESSAGES[field]));

    return duplicated ? [{ field: duplicated, message }] : [];
};
