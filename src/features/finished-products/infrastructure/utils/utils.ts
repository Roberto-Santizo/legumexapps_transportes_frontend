/**
 * Único punto del front donde un error del backend de productos terminados se
 * traduce a texto y a campo del formulario, donde se arma el payload y donde
 * las fechas dejan de ser la cadena `d-m-Y h:i:s A` de la API.
 *
 * Trampas del dominio que se resuelven aquí:
 * - el `code` duplicado y el cliente borrado llegan como **400 en `message`**,
 *   no como 422 en `errors`: se anclan a su campo reconociendo el texto;
 * - el `name` solo pasa a MAYÚSCULAS en el backend (sin recorte ni colapso de
 *   espacios), así que se limpia aquí antes de enviar;
 * - el `PATCH` debe llevar solo lo que cambió: reenviar el `clientId` de un
 *   cliente borrado da 400 aunque sea el mismo.
 */

import { can, type Option } from "@/features/shared/shared";
import type { Client } from "@/features/clients/clients";
import type {
    FinishedProduct,
    FinishedProductField,
    FinishedProductFilters,
    FinishedProductForm,
    FinishedProductPayload,
    FinishedProductUpdatePayload
} from "@/features/finished-products/finished-products";
import { isAxiosError, type AxiosError } from "axios";

/** Límites que valida el backend. Se replican para no gastar un viaje en un 422. */
export const FINISHED_PRODUCT_CODE_MAX_LENGTH = 15;
export const FINISHED_PRODUCT_NAME_MAX_LENGTH = 255;
export const FINISHED_PRODUCT_AMOUNT_MIN = 0.01;
export const FINISHED_PRODUCT_AMOUNT_MAX = 99999999.99;

/** El `code` no admite ningún espacio, ni interior: la API lo rechaza, no lo corrige. */
export const FINISHED_PRODUCT_CODE_PATTERN = /^\S+$/;

/** Hasta dos decimales, con punto. */
export const FINISHED_PRODUCT_AMOUNT_PATTERN = /^\d+(\.\d{1,2})?$/;

/** Los clientes activos del selector caben de sobra en una sola página. */
export const FINISHED_PRODUCT_CLIENTS_LIMIT = '100';

/** Leen todos menos el `pilot` (al revés que el resto de catálogos). */
export const canReadFinishedProducts = (role?: string): boolean => can(role, 'readFinishedProducts');

/** Crear, editar y borrar es de `administrator` y `export`. */
export const canWriteFinishedProducts = (role?: string): boolean => can(role, 'writeTripCatalogs');

/** Recorte y MAYÚSCULAS, como el backend. Solo para comparar en la confirmación de borrado. */
export const normalizeFinishedProductCode = (value: string): string => value.trim().toUpperCase();

/** El backend guarda el nombre tal cual: aquí se recorta y se colapsan los espacios. */
const cleanName = (value: string): string => value.trim().replace(/\s+/g, ' ');

/** Un filtro vacío no se manda. Un `clientId` no numérico tampoco: el backend lo ignoraría. */
export const buildFinishedProductQuery = (limit: string, page: string, filters?: FinishedProductFilters): string => {
    const query = new URLSearchParams({ limit, page });

    if (filters?.search?.trim()) query.set('search', filters.search.trim());
    if (filters?.clientId && /^\d+$/.test(filters.clientId)) query.set('clientId', filters.clientId);

    return query.toString();
};

/**
 * El cuerpo del alta. Las cantidades viajan como número (vuelven como string
 * con dos decimales). No se pasa a mayúsculas: lo hace el backend.
 */
export const buildFinishedProductPayload = (form: FinishedProductForm): FinishedProductPayload => ({
    code: form.code.trim(),
    name: cleanName(form.name),
    presentation: Number(form.presentation),
    boxesPerPallet: Number(form.boxesPerPallet),
    clientId: Number(form.clientId),
});

/**
 * El cuerpo del `PATCH`: solo los campos que difieren del registro cargado,
 * comparados ya normalizados. Un cuerpo vacío es un no-op válido con 200.
 */
export const buildFinishedProductUpdatePayload = (
    form: FinishedProductForm,
    original: FinishedProduct
): FinishedProductUpdatePayload => {
    const next = buildFinishedProductPayload(form);
    const payload: FinishedProductUpdatePayload = {};

    if (normalizeFinishedProductCode(next.code) !== original.code) payload.code = next.code;
    if (next.name.toUpperCase() !== original.name) payload.name = next.name;
    if (next.presentation !== Number(original.presentation)) payload.presentation = next.presentation;
    if (next.boxesPerPallet !== Number(original.boxesPerPallet)) payload.boxesPerPallet = next.boxesPerPallet;
    if (next.clientId !== original.clientId) payload.clientId = next.clientId;

    return payload;
};

/**
 * Opciones del selector de clientes. `/clients` ya excluye los borrados; si el
 * SKU apunta a uno borrado se añade como opción marcada para que el campo no
 * quede en blanco al editar (no se reenvía mientras no se cambie).
 */
export const toFinishedProductClientOptions = (clients: Client[], current?: FinishedProduct): Option[] => {
    const options: Option[] = clients.map((client) => ({ value: client.id, label: `${client.code} · ${client.name}` }));

    if (current && !clients.some((client) => client.id === current.clientId)) {
        options.unshift({
            value: current.clientId,
            label: `${current.clientName ?? `Cliente ${current.clientId}`} (eliminado)`
        });
    }

    return options;
};

const decimalFormatter = new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

/** `"96.50"` → `96.50` con separador de miles. Si no es numérico se pinta tal cual. */
export const formatFinishedProductAmount = (value: string): string => {
    const amount = Number(value);

    return Number.isFinite(amount) ? decimalFormatter.format(amount) : value;
};

/** `d-m-Y h:i:s A` de la API → `Date`. `new Date()` no lo parsea. */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

export const parseFinishedProductMoment = (value: string): Date | null => {
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
export const formatFinishedProductMoment = (value: string, withTime = false): string => {
    const date = parseFinishedProductMoment(value);

    if (!date) return value;

    return withTime
        ? `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`
        : dateFormatter.format(date);
};

/** El datasource relanza con el error de axios en `cause`: se desenvuelve. */
const toAxiosError = (error: unknown): AxiosError | null => {
    let current: unknown = error;

    for (let depth = 0; depth < 4 && current; depth++) {
        if (isAxiosError(current)) return current;

        current = current instanceof Error ? current.cause : null;
    }

    return null;
};

/** Los 400 que pertenecen a un campo aunque lleguen en `message`. */
const FIELD_MESSAGES: Partial<Record<FinishedProductField, string>> = {
    code: "Ya existe un producto terminado con ese código",
    clientId: "El cliente seleccionado ya fue eliminado",
};

const FORM_FIELDS: FinishedProductField[] = ['code', 'name', 'presentation', 'boxesPerPallet', 'clientId'];

/** El 400 que responden `PATCH` y `DELETE` sobre un SKU ya borrado. */
export const FINISHED_PRODUCT_ALREADY_DELETED_MESSAGE = "El producto terminado ya fue eliminado";

/**
 * Dos formatos: el sobre `{ statusCode, message, data }` para 400/401/403/404
 * y el de Laravel `{ message, errors }` para el 422.
 */
export const getFinishedProductErrorMessage = (error: unknown): string => {
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

export type FinishedProductFieldError = {
    field: FinishedProductField;
    message: string;
}

/**
 * Reparte el error entre los campos del formulario: el 422 por las claves de
 * `errors` (camelCase, tal como se enviaron) y los dos 400 de campo por su
 * texto. Lo demás (403, 404, «ya fue eliminado») devuelve vacío y se muestra
 * como notificación.
 */
export const getFinishedProductFieldErrors = (error: unknown): FinishedProductFieldError[] => {
    const data = toAxiosError(error)?.response?.data;

    if (!data || typeof data !== 'object') return [];

    const { errors, message } = data as { errors?: unknown; message?: unknown };

    if (errors && typeof errors === 'object') {
        const collected = FORM_FIELDS.flatMap((field) => {
            const entry = (errors as Record<string, unknown>)[field];
            const first = (Array.isArray(entry) ? entry : [entry])
                .find((value): value is string => typeof value === 'string');

            return first ? [{ field, message: first }] : [];
        });

        if (collected.length > 0) return collected;
    }

    if (typeof message !== 'string') return [];

    const field = (Object.keys(FIELD_MESSAGES) as FinishedProductField[])
        .find((key) => message.startsWith(FIELD_MESSAGES[key]!));

    return field ? [{ field, message }] : [];
};
