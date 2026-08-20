/**
 * Único punto del front donde los importes del accesorio dejan de ser cadena,
 * donde las fechas cambian de formato y donde un error del backend se traduce a
 * un texto para el usuario.
 *
 * Los dos errores caros de este dominio se evitan aquí: tratar `currentValue`
 * como un dato guardado —se recalcula en cada lectura y cambia cada día— y
 * mandar la fecha de compra en el formato en el que se recibe, que no es el
 * formato en el que se envía.
 */

import type { Accessory, AccessoryFilters, AccessoryForm } from "@/features/accessories/accessories";
import type { Option } from "@/features/shared/shared";
import { isAxiosError } from "axios";

/**
 * Los tres estados del accesorio. No es un booleano y no hay endpoint de
 * toggle: el estado solo se mueve editando, en cualquier dirección y sin reglas
 * de transición. Solo se ofrece en la edición: al crear, el accesorio nace
 * `active`.
 */
export const ACCESSORY_STATUSES: Option[] = [
    { value: "active", label: "Activo" },
    { value: "inactive", label: "Dado de baja" },
    { value: "under_repair", label: "En reparación" },
];

export const ACCESSORY_STATUS_LABELS: Record<string, string> = Object.fromEntries(
    ACCESSORY_STATUSES.map((status) => [status.value, status.label])
);

/** Límites que valida el backend. Se replican para no gastar un 422. */
export const ACCESSORY_NAME_MAX_LENGTH = 255;
export const ACCESSORY_CODE_MAX_LENGTH = 255;
export const ACCESSORY_DESCRIPTION_MAX_LENGTH = 1000;
/** El mínimo del precio es 0.01, no 0: un accesorio de precio cero se rechaza. */
export const ACCESSORY_PRICE_MIN = 0.01;
export const ACCESSORY_PRICE_MAX = 99999999.99;
/** La depreciación sí admite el cero: significa que el accesorio no se deprecia. */
export const ACCESSORY_DEPRECIATION_MIN = 0;
export const ACCESSORY_DEPRECIATION_MAX = 100;

/** Leer lo puede cualquier autenticado; crear, editar y dar de baja es solo de `administrator`. */
export const canWriteAccessories = (role?: string): boolean => role === 'administrator';

/** Cadena de la API → número. Un importe ilegible se trata como 0, nunca como NaN. */
export const toAmount = (value: string | null): number => {
    const amount = Number(value);

    return Number.isFinite(amount) ? amount : 0;
};

/**
 * Solo para mostrar. La API no manda símbolo: el quetzal lo pone el front
 * porque es convención del dominio.
 */
export const formatQuetzales = (value: string | null): string =>
    `Q${toAmount(value).toLocaleString('es-GT', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })}`;

/** El porcentaje anual llega como cadena con dos decimales: `"20.00"` → `20 %`. */
export const formatDepreciation = (value: string | null): string => {
    const percent = toAmount(value);

    return `${percent.toLocaleString('es-GT', {
        minimumFractionDigits: percent % 1 === 0 ? 0 : 2,
        maximumFractionDigits: 2
    })} %`;
};

/** `d-m-Y` de la API → `Date`. Devuelve `null` si el texto no tiene esa forma. */
const DATE_PATTERN = /^(\d{2})-(\d{2})-(\d{4})$/;

export const parseAccessoryDate = (value: string): Date | null => {
    const parts = DATE_PATTERN.exec(value.trim());

    if (!parts) return null;

    const [, day, month, year] = parts;
    const date = new Date(Number(year), Number(month) - 1, Number(day));

    return Number.isNaN(date.getTime()) ? null : date;
};

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

/** `20-08-2024` → `20 ago 2024`. Si no se puede parsear, se pinta tal cual llegó. */
export const formatAccessoryDate = (value: string): string => {
    const date = parseAccessoryDate(value);

    return date ? dateFormatter.format(date) : value;
};

/** `Date` → `20 ago 2029`, para rotular el final de la regla de depreciación. */
export const formatDate = (date: Date): string => dateFormatter.format(date);

const toInputValue = (date: Date): string =>
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

/**
 * `d-m-Y` de la API → `Y-m-d` del input. Los dos formatos no coinciden y
 * confundirlos es el error clásico al poblar el formulario de edición.
 */
export const toDateInputValue = (value: string): string => {
    const date = parseAccessoryDate(value);

    return date ? toInputValue(date) : '';
};

/** Tope del selector de fecha: la compra no puede ser futura, pero hoy sí vale. */
export const todayInputValue = (): string => toInputValue(new Date());

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de Laravel
 * `{ message, errors }` para el 422. En el 422 el `message` trae la coletilla
 * «(and 2 more errors)», así que se prefieren los mensajes de `errors`, que ya
 * vienen redactados en español y nombran el campo que falla.
 */
export const getAccessoryErrorMessage = (error: unknown): string => {
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

/** Los filtros vacíos no se mandan: el backend los ignora y ensucian la URL. */
export const buildAccessoryQuery = (limit: string, page: string, filters?: AccessoryFilters): string => {
    const query = new URLSearchParams({ limit, page });

    if (filters?.status) query.set('status', filters.status);
    if (filters?.search) query.set('search', filters.search);

    return query.toString();
};

/**
 * Lo que se envía al crear o editar. `currentValue` no aparece por ningún lado:
 * es derivado y el backend lo descarta en silencio. En el alta tampoco viaja
 * `status`, que solo existe en la edición.
 */
export const buildAccessoryPayload = (payload: AccessoryForm): AccessoryForm => ({
    name: payload.name.trim(),
    code: payload.code.trim(),
    /** Vacía se manda como `null`, que es lo que borra la descripción guardada. */
    description: payload.description?.trim() ? payload.description.trim() : null,
    price: Number(payload.price),
    purchaseDate: payload.purchaseDate,
    annualDepreciation: Number(payload.annualDepreciation),
    ...(payload.status ? { status: payload.status } : {})
});

const DAYS_IN_YEAR = 365;
const MS_IN_DAY = 24 * 60 * 60 * 1000;

export type AccessoryDepreciation = {
    price: number;
    currentValue: number;
    /** Cuánto valor queda, en [0, 1]. Es lo que llena la regla de depreciación. */
    remainingRatio: number;
    /** Cuánto se ha perdido desde la compra, en quetzales. */
    lostValue: number;
    /** Día en que el accesorio llega a cero. `null` si no se deprecia. */
    exhaustedAt: Date | null;
    /** `true` cuando ya vale cero: la regla se pinta agotada. */
    isExhausted: boolean;
}

/**
 * La misma cuenta que hace el backend en cada lectura —lineal, 365 días fijos,
 * con piso en cero—, replicada para poder anotar en pantalla cuánto valor queda
 * y cuándo se agota. El `currentValue` que se **muestra** siempre es el de la
 * respuesta: esto solo deriva el contexto alrededor.
 */
export const getAccessoryDepreciation = (accessory: Accessory): AccessoryDepreciation => {
    const price = toAmount(accessory.price);
    const currentValue = toAmount(accessory.currentValue);
    const rate = toAmount(accessory.annualDepreciation);
    const purchasedAt = parseAccessoryDate(accessory.purchaseDate);

    const remainingRatio = price > 0 ? Math.min(Math.max(currentValue / price, 0), 1) : 0;

    const exhaustedAt = rate > 0 && purchasedAt
        ? new Date(purchasedAt.getTime() + (DAYS_IN_YEAR * MS_IN_DAY * 100) / rate)
        : null;

    return {
        price,
        currentValue,
        remainingRatio,
        lostValue: Math.max(price - currentValue, 0),
        exhaustedAt,
        isExhausted: currentValue <= 0
    };
};

/**
 * `createdAt` llega como `d-m-Y h:i:s A`, que `Date` no parsea. Se desarma a
 * mano para no depender del navegador; si no encaja, se muestra tal cual.
 */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

const timeFormatter = new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit'
});

export const formatAccessoryMoment = (value: string): string => {
    const parts = MOMENT_PATTERN.exec(value.trim());

    if (!parts) return value;

    const [, day, month, year, rawHour, minute, second, meridiem] = parts;
    const hour = Number(rawHour) % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0);

    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second));

    if (Number.isNaN(date.getTime())) return value;

    return `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`;
};
