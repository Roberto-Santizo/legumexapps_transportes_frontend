/**
 * Normalización, conversiones y traducción de errores de las características.
 * Es el único punto donde el cuerpo pasa a `snake_case`, donde se replica la
 * normalización que hace el backend y donde un fallo de la API se convierte en
 * un texto para el usuario.
 *
 * Los dos errores caros de este dominio se evitan aquí: mandar `accessoryId` en
 * el cuerpo del alta —el query param es camelCase pero el cuerpo es
 * snake_case— y tratar `createdAt` como ISO 8601 cuando llega ya formateado en
 * `d-m-Y h:i:s A`.
 *
 * Nada de esto se importa de `accessories`: el detalle del accesorio depende de
 * este módulo, así que la dependencia inversa cerraría el círculo entre los dos.
 */

import type { AccessoryCharacteristicForm } from "@/features/accessory-characteristics/accessory-characteristics";
import { isAxiosError } from "axios";

/** Límites que valida el backend. Se replican para no gastar un 422. */
export const CHARACTERISTIC_NAME_MAX_LENGTH = 255;
export const CHARACTERISTIC_VALUE_MAX_LENGTH = 500;

/**
 * Literal del 400 por nombre repetido. Llega como error de negocio, no como
 * 422, así que sin compararlo contra este texto no habría forma de colgarlo del
 * input del nombre, que es donde el usuario puede arreglarlo.
 */
export const DUPLICATE_NAME_MESSAGE = "El accesorio ya tiene una característica con ese nombre";

/**
 * Literal del 404 del listado. Es un accesorio que no está, que no es lo mismo
 * que un accesorio sin características: eso último llega como `data: []`.
 */
export const ACCESSORY_NOT_FOUND_MESSAGE = "El accesorio no existe";

/** Leer lo puede cualquier autenticado; crear, editar y eliminar es solo de `administrator`. */
export const canWriteAccessoryCharacteristics = (role?: string): boolean => role === 'administrator';

/**
 * La misma normalización que aplica el backend antes de validar: recortar,
 * colapsar los espacios internos y subir a mayúsculas. Se replica para poder
 * enseñar en el formulario cómo va a quedar guardado el nombre, no para
 * ahorrarse la del servidor —que manda igual—.
 */
export const normalizeCharacteristicName = (value: string): string =>
    value.trim().replace(/\s+/g, ' ').toUpperCase();

/**
 * El cuerpo va en `snake_case` aunque la respuesta salga en `camelCase`, y el
 * query param del listado sea `accessoryId`. No es simétrico y no hay
 * conversión automática: mandar `accessoryId` aquí es un 422 por campo ausente.
 *
 * `accessory_id` solo viaja en el alta —en la edición el backend lo ignora en
 * silencio— y `registered_by` no se manda nunca: sale del usuario autenticado.
 */
export const buildAccessoryCharacteristicPayload = (
    payload: AccessoryCharacteristicForm,
    accessoryId?: string
) => ({
    ...(accessoryId ? { accessory_id: Number(accessoryId) } : {}),
    name: normalizeCharacteristicName(payload.name),
    value: payload.value.trim()
});

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de Laravel
 * `{ message, errors }` para el 422. En el 422 el `message` trae la coletilla
 * «(and 2 more errors)», así que se prefieren los mensajes de `errors`, que ya
 * vienen redactados en español y nombran el campo que falla.
 */
export const getAccessoryCharacteristicErrorMessage = (error: unknown): string => {
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

/**
 * `createdAt` llega como `d-m-Y h:i:s A`, que `Date` no parsea. Se desarma a
 * mano para no depender del navegador; si no encaja, se muestra tal cual llegó.
 */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit'
});

export const formatCharacteristicMoment = (value: string): string => {
    const parts = MOMENT_PATTERN.exec(value.trim());

    if (!parts) return value;

    const [, day, month, year, rawHour, minute, second, meridiem] = parts;
    const hour = Number(rawHour) % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0);

    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second));

    if (Number.isNaN(date.getTime())) return value;

    return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
};
