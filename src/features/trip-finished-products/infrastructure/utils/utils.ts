/**
 * Único punto del front donde las líneas de producto terminado de un viaje se
 * convierten en payload, en totales y en texto de error.
 *
 * Trampas del dominio que se resuelven aquí:
 * - la API **no calcula** cajas totales ni tarimas: se suman aquí, con
 *   `presentation`/`boxesPerPallet` como cadenas que hay que convertir;
 * - los 422 del alta del viaje llegan como `products.{i}.{campo}`, con índice
 *   desde 0, y hay que devolverlos a su fila;
 * - varios 400 pertenecen al selector de producto aunque lleguen en `message`.
 *
 * Esta feature no importa nada de `trips` (que sí la importa a ella): el estado
 * del viaje entra como cadena.
 */

import { can, type Option } from "@/features/shared/shared";
import type { FinishedProduct } from "@/features/finished-products/finished-products";
import type {
    TripFinishedProduct,
    TripFinishedProductField,
    TripFinishedProductForm,
    TripFinishedProductPayload,
    TripProductLine,
    TripProductLineValues
} from "@/features/trip-finished-products/trip-finished-products";
import { isAxiosError, type AxiosError } from "axios";

/** Límites que valida el backend. Se replican para no gastar un viaje en un 422. */
export const TRIP_PRODUCT_BOXES_MIN = 1;
export const TRIP_PRODUCT_BOXES_MAX = 999999;

/** Los SKU de un cliente caben de sobra en una página (el backend acota `limit` a 100). */
export const TRIP_PRODUCTS_CATALOG_LIMIT = '100';

/** Reglas de `react-hook-form` para el input de cajas: entero de 1 a 999999. */
export const TRIP_PRODUCT_BOXES_VALIDATION = {
    required: "Las cajas son obligatorias",
    valueAsNumber: true,
    validate: (value: unknown) => {
        const boxes = Number(value);

        if (value === undefined || value === '' || Number.isNaN(boxes)) return "Las cajas son obligatorias";
        if (!Number.isInteger(boxes)) return "Las cajas deben ser un número entero";
        if (boxes < TRIP_PRODUCT_BOXES_MIN) return `Las cajas deben ser al menos ${TRIP_PRODUCT_BOXES_MIN}`;
        if (boxes > TRIP_PRODUCT_BOXES_MAX) return `Las cajas no pueden superar ${TRIP_PRODUCT_BOXES_MAX}`;

        return true;
    }
} as const;

/** Agregar, editar cajas y quitar líneas es de `administrator` y `export`: los que publican viajes. */
export const canWriteTripFinishedProducts = (role?: string): boolean => can(role, 'manageTrips');

/** En `in_route` o `finished` las tres escrituras responden 400: modo solo lectura. */
export const isTripFinishedProductsEditable = (status: string): boolean => status === 'pending';

/* ------------------------------------------------------------------ *
 * Payloads
 * ------------------------------------------------------------------ */

/** Las líneas del `POST /api/trips`. Vacías no llegan aquí: los `required` de cada fila lo impiden. */
export const buildTripProductLines = (values: TripProductLineValues[] | undefined): TripProductLine[] =>
    (values ?? []).map((line) => ({
        finishedProductId: Number(line.finishedProductId),
        boxes: Number(line.boxes),
    }));

export const buildTripFinishedProductPayload = (tripId: number, form: TripFinishedProductForm): TripFinishedProductPayload => ({
    tripId,
    finishedProductId: Number(form.finishedProductId),
    boxes: Number(form.boxes),
});

/* ------------------------------------------------------------------ *
 * Totales y formato
 * ------------------------------------------------------------------ */

export const sumTripBoxes = (lines: Pick<TripFinishedProduct, 'boxes'>[]): number =>
    lines.reduce((total, line) => total + line.boxes, 0);

/**
 * Tarimas de una línea: `boxes / boxesPerPallet`. La API no las calcula.
 * `null` si el producto no tiene un `boxesPerPallet` utilizable.
 */
export const tripLinePallets = (boxes: number, boxesPerPallet: string): number | null => {
    const perPallet = parseFloat(boxesPerPallet);

    return Number.isFinite(perPallet) && perPallet > 0 ? boxes / perPallet : null;
};

/** Suma de tarimas del viaje; las líneas sin `boxesPerPallet` válido no cuentan. */
export const sumTripPallets = (lines: Pick<TripFinishedProduct, 'boxes' | 'boxesPerPallet'>[]): number =>
    lines.reduce((total, line) => total + (tripLinePallets(line.boxes, line.boxesPerPallet) ?? 0), 0);

const integerFormatter = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });

const decimalFormatter = new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
});

export const formatTripBoxes = (boxes: number): string => integerFormatter.format(boxes);

export const formatTripPallets = (pallets: number | null): string =>
    pallets === null ? '—' : decimalFormatter.format(pallets);

/** `"10.00"` → `10`. Si no es numérico se pinta tal cual. */
export const formatTripProductDecimal = (value: string): string => {
    const amount = parseFloat(value);

    return Number.isFinite(amount) ? decimalFormatter.format(amount) : value;
};

/**
 * Opciones del selector de productos del cliente. `exclude` son los productos
 * que ya están en el viaje (o en otras filas del formulario): repetirlos es
 * 400 en el detalle y 422 en el alta.
 */
export const toTripFinishedProductOptions = (products: FinishedProduct[], exclude: number[] = []): Option[] =>
    products
        .filter((product) => !exclude.includes(product.id))
        .map((product) => ({
            value: product.id,
            label: `${product.code} · ${product.name} · ${formatTripProductDecimal(product.presentation)}`
        }));

/** `d-m-Y h:i:s A` de la API → texto legible. `new Date()` no lo parsea. */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

const momentFormatter = new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
});

/** Si el texto no encaja con el formato de la API se pinta tal cual llegó. */
export const formatTripFinishedProductMoment = (value: string): string => {
    const parts = MOMENT_PATTERN.exec(value.trim());

    if (!parts) return value;

    const [, day, month, year, rawHour, minute, second, meridiem] = parts;
    const hour = Number(rawHour) % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0);
    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second));

    return Number.isNaN(date.getTime()) ? value : momentFormatter.format(date);
};

/* ------------------------------------------------------------------ *
 * Errores
 * ------------------------------------------------------------------ */

/** El 400 de `PATCH /api/trips/{trip}` al cambiar el cliente de un viaje con líneas. */
export const TRIP_CLIENT_LOCKED_MESSAGE = "No se puede cambiar el cliente de un viaje con productos terminados";

/** El 400 de borrar la última línea. */
export const TRIP_LAST_PRODUCT_MESSAGE = "El viaje debe tener al menos un producto terminado";

/** El 400 de escribir en un viaje que ya no está `pending`. */
export const TRIP_PRODUCTS_NOT_PENDING_MESSAGE = "Solo se pueden modificar los productos de un viaje pendiente";

/** El datasource relanza con el error de axios en `cause`: se desenvuelve. */
const toAxiosError = (error: unknown): AxiosError | null => {
    let current: unknown = error;

    for (let depth = 0; depth < 4 && current; depth++) {
        if (isAxiosError(current)) return current;

        current = current instanceof Error ? current.cause : null;
    }

    return null;
};

/** Primer mensaje de una entrada de `errors`, venga como array o suelto. */
const firstMessage = (entry: unknown): string | undefined =>
    (Array.isArray(entry) ? entry : [entry]).find((value): value is string => typeof value === 'string');

/**
 * Dos formatos: el sobre `{ statusCode, message, data }` para 400/401/403/404
 * y el de Laravel `{ message, errors }` para el 422.
 */
export const getTripFinishedProductErrorMessage = (error: unknown): string => {
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

/** Los 400 del service que pertenecen al selector de producto aunque lleguen en `message`. */
const PRODUCT_FIELD_MESSAGES = [
    "El producto terminado seleccionado ya fue eliminado",
    "El producto terminado no pertenece al cliente del viaje",
    "El producto terminado ya está en el viaje",
];

const LINE_FIELDS: TripFinishedProductField[] = ['finishedProductId', 'boxes'];

export type TripFinishedProductFieldError = {
    field: TripFinishedProductField;
    message: string;
}

/**
 * Reparte el error de alta/edición de una línea entre los campos del modal. Lo
 * demás («viaje pendiente», «ya fue eliminado», 403, 404) devuelve vacío y se
 * muestra como notificación.
 */
export const getTripFinishedProductFieldErrors = (error: unknown): TripFinishedProductFieldError[] => {
    const data = toAxiosError(error)?.response?.data;

    if (!data || typeof data !== 'object') return [];

    const { errors, message } = data as { errors?: unknown; message?: unknown };

    if (errors && typeof errors === 'object') {
        const collected = LINE_FIELDS.flatMap((field) => {
            const first = firstMessage((errors as Record<string, unknown>)[field]);

            return first ? [{ field, message: first }] : [];
        });

        if (collected.length > 0) return collected;
    }

    if (typeof message === 'string' && PRODUCT_FIELD_MESSAGES.some((known) => message.startsWith(known))) {
        return [{ field: 'finishedProductId', message }];
    }

    return [];
};

export type TripProductLineError = {
    /** `null` es el error de la lista entera (`products`), no de una fila. */
    index: number | null;
    field: TripFinishedProductField | null;
    message: string;
}

const LINE_ERROR_KEY = /^products\.(\d+)\.(finishedProductId|boxes)$/;

/**
 * Los 422 de `products` en `POST /api/trips`: `products.{i}.{campo}` con
 * índice desde 0, y `products` a secas para la lista. Los 400 de producto
 * (no pertenece al cliente, borrado) no traen índice: esos van a notificación.
 */
export const getTripProductLineErrors = (error: unknown): TripProductLineError[] => {
    const errors = (toAxiosError(error)?.response?.data as { errors?: unknown } | undefined)?.errors;

    if (!errors || typeof errors !== 'object') return [];

    return Object.entries(errors as Record<string, unknown>).flatMap(([key, entry]): TripProductLineError[] => {
        const message = firstMessage(entry);

        if (!message) return [];
        if (key === 'products') return [{ index: null, field: null, message }];

        const match = LINE_ERROR_KEY.exec(key);

        return match
            ? [{ index: Number(match[1]), field: match[2] as TripFinishedProductField, message }]
            : [];
    });
};
