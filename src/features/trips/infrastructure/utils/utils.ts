/**
 * Único punto del front donde un error del backend de viajes se traduce a
 * texto, donde se decide a qué campo se ancla, y donde las fechas cambian de
 * formato en las dos direcciones.
 *
 * Aquí se resuelven las tres trampas del dominio:
 *
 * - **Las fechas entran en un formato y salen en otro.** La API devuelve
 *   `d-m-Y h:i:s A` —que `new Date()` no parsea— y acepta `Y-m-d H:i:s`. Lo que
 *   se recibe **no** se puede reenviar.
 * - **El reparto 422 / 400 no es el habitual.** Las cuatro claves foráneas
 *   validan con `exists:`, que lee la tabla en crudo: un id inventado es 422,
 *   pero uno borrado o inservible pasa la validación y lo para el service con
 *   un 400 suelto en `message`.
 * - **`status` puede contradecir a las fechas.** No hay máquina de estados, así
 *   que el relato se cuenta desde las fechas y el estado se marca como lo que
 *   es: una etiqueta que alguien movió a mano.
 */

import type { Option } from "@/features/shared/shared";
import type { TripAssignmentForm, TripField, TripFilters, TripForm, TripListItem, TripStatus, TripUpdateForm } from "@/features/trips/trips";
import { isAxiosError, type AxiosError } from "axios";

/** Límite que valida el backend en los cinco campos de texto. */
export const TRIP_TEXT_MAX_LENGTH = 255;

/** Los catálogos del formulario no paginan en la práctica: se piden enteros. */
export const TRIP_CATALOG_LIMIT = '100';

/** La tripulación de una empresa cabe de sobra en una sola página. */
export const TRIP_CREW_LIMIT = '100';

/**
 * El enum crudo traducido. La API lo devuelve en inglés y traducirlo es cosa
 * del front: no hay ningún endpoint que dé estas etiquetas.
 */
export const TRIP_STATUS_LABELS: Record<TripStatus, string> = {
    pending: "Pendiente",
    in_route: "En ruta",
    finished: "Finalizado",
};

/** Para el `select` de estado del filtro y de la edición. */
export const TRIP_STATUSES: Option[] = (Object.keys(TRIP_STATUS_LABELS) as TripStatus[])
    .map((value) => ({ value, label: TRIP_STATUS_LABELS[value] }));

/** Publicar, editar y dar de baja es solo de `administrator`. Los cuatro roles leen. */
export const canWriteTrips = (role?: string): boolean => role === 'administrator';

/**
 * Tomar el viaje es solo de `carrier`, y además con empresa registrada: sin
 * ella el middleware `carrier.required` responde 403 antes del service. **El
 * administrador no puede asignar por ninguna ruta.**
 */
export const canAssignTrips = (role?: string, carrierId?: number | null): boolean =>
    role === 'carrier' && typeof carrierId === 'number';

/** Arrancar y cerrar es solo del piloto, y dentro el service exige que sea *el* asignado. */
export const canRunTrips = (role?: string): boolean => role === 'pilot';

/**
 * La bolsa: el viaje que todavía no tomó nadie. Es lo que separa las dos listas
 * del transportista, porque su ámbito mezcla la bolsa con lo suyo en la misma
 * respuesta y la API no trae ninguna marca para distinguirlas.
 *
 * Se mira la **tripulación y no `assignedById`**, que ya no viaja en el
 * listado: `/assignment` exige piloto y vehículo juntos, así que un viaje sin
 * piloto es exactamente un viaje que nadie tomó.
 */
export const isTripInBag = (trip: Pick<TripListItem, 'pilotName'>): boolean => trip.pilotName === null;

/** Reasignar solo mientras siga `pending`: `in_route` o `finished` responden 400. */
export const canAssignTrip = (trip: Pick<TripListItem, 'status'>): boolean => trip.status === 'pending';

/** Un segundo `/start` responde 400. */
export const canStartTrip = (trip: Pick<TripListItem, 'startDate'>): boolean => trip.startDate === null;

/** No se cierra un viaje que nunca arrancó: sin `startDate` la API responde 400. */
export const canFinishTrip = (trip: Pick<TripListItem, 'startDate' | 'endDate'>): boolean =>
    trip.startDate !== null && trip.endDate === null;

/* ------------------------------------------------------------------ *
 * Fechas
 * ------------------------------------------------------------------ */

/** El formato de **salida** de la API. No es ISO 8601 y `Date` no lo entiende. */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

/** `d-m-Y h:i:s A` → `Date`. Se desarma a mano para no depender del navegador. */
export const parseTripMoment = (value: string): Date | null => {
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
export const formatTripMoment = (value: string, withTime = false): string => {
    const date = parseTripMoment(value);

    if (!date) return value;

    return withTime
        ? `${dateFormatter.format(date)} · ${timeFormatter.format(date)}`
        : dateFormatter.format(date);
};

const pad = (value: number): string => value.toString().padStart(2, '0');

/**
 * Lo que teclea un `<input type="datetime-local">` (`2026-09-02T06:00`) →
 * `Y-m-d H:i:s`, el formato que **sí** acepta la API. El input no da segundos,
 * así que se completan con `:00`.
 *
 * No pasa por `toISOString()` a propósito: eso desplazaría la hora a UTC y
 * movería el viaje seis husos.
 */
export const toApiDateTime = (value: string): string => {
    const trimmed = value.trim();

    if (!trimmed) return trimmed;

    const [date, time = ''] = trimmed.split('T');
    const [hour = '00', minute = '00', second = '00'] = time.split(':');

    return `${date} ${pad(Number(hour))}:${pad(Number(minute))}:${pad(Number(second))}`;
};

/**
 * `d-m-Y h:i:s A` de la API → el valor que espera un `datetime-local`. Es el
 * paso obligatorio al precargar la edición: reenviar el formato de salida tal
 * cual es un 422.
 */
export const toInputDateTime = (value: string | null): string => {
    if (!value) return '';

    const date = parseTripMoment(value);

    if (!date) return '';

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

/** El `min` de los dos `datetime-local` del alta: la API exige fecha futura. */
export const nowForInput = (): string => {
    const now = new Date();

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}`;
};

/**
 * Compara los dos `datetime-local` del formulario. El backend solo aplica
 * `after_or_equal` cuando las dos fechas viajan en el **mismo** cuerpo, así que
 * esta comprobación es lo único que impide guardar un viaje que embarca antes
 * de recolectarse.
 *
 * Se comparan como cadenas: el formato del input ya ordena
 * lexicográficamente.
 */
export const isShipDateBeforeRecolection = (recolectionDate: string, shipDate: string): boolean => {
    if (!recolectionDate || !shipDate) return false;

    return shipDate < recolectionDate;
};

/** Días enteros entre dos momentos de la API. `null` si alguno no llegó. */
export const daysBetweenMoments = (from: string | null, to: string | null): number | null => {
    if (!from || !to) return null;

    const start = parseTripMoment(from);
    const end = parseTripMoment(to);

    if (!start || !end) return null;

    return Math.round((end.getTime() - start.getTime()) / 86_400_000);
};

/* ------------------------------------------------------------------ *
 * Peticiones
 * ------------------------------------------------------------------ */

/** Los filtros de fecha van en `Y-m-d` estricto: cualquier otra forma se ignora. */
const STRICT_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Un filtro vacío no se manda: el backend lo ignora y solo ensucia la URL. Las
 * dos fechas se descartan si no son `Y-m-d` estricto, porque mandarlas mal no
 * da error —devuelve el listado entero— y el usuario creería que filtró.
 */
export const buildTripQuery = (limit: string, page: string, filters?: TripFilters): string => {
    const query = new URLSearchParams({ limit, page });

    const plain: (keyof TripFilters)[] = ['status', 'clientId', 'shippingLineId', 'locationId', 'pilotId', 'vehicleId'];

    plain.forEach((key) => {
        const value = filters?.[key]?.trim();

        if (value) query.set(key, value);
    });

    (['dateFrom', 'dateTo'] as const).forEach((key) => {
        const value = filters?.[key]?.trim();

        if (value && STRICT_DATE_PATTERN.test(value)) query.set(key, value);
    });

    if (filters?.search?.trim()) query.set('search', filters.search.trim());

    return query.toString();
};

/**
 * El cuerpo del alta. Los textos solo se recortan: pasarlos a mayúsculas es
 * cosa del backend, y lo que se pinta después es siempre lo que devuelve la
 * respuesta, no lo que se tecleó.
 */
export const buildTripPayload = (form: TripForm): TripForm => ({
    order: form.order.trim(),
    clientId: Number(form.clientId),
    shippingLineId: Number(form.shippingLineId),
    departurePointId: Number(form.departurePointId),
    locationId: Number(form.locationId),
    destination: form.destination.trim(),
    container: form.container.trim(),
    transport: form.transport.trim(),
    recolectionDate: toApiDateTime(form.recolectionDate),
    shipDate: toApiDateTime(form.shipDate),
    polyline: form.polyline,
    observations: form.observations.trim(),
});

/**
 * El cuerpo de la edición. Se mandan **los trece campos siempre**, y es
 * deliberado:
 *
 * - La polilínea **no se recalcula sola, nunca**. Si cambia `locationId` o
 *   `departurePointId` y no viaja `polyline` en el **mismo** `PATCH`, la
 *   guardada queda mintiendo y la API no avisa: el mapa dibujaría una ruta que
 *   ya no corresponde.
 * - `shipDate` solo se compara contra `recolectionDate` cuando las dos van en
 *   el mismo cuerpo. Mandarlas juntas cierra el hueco.
 *
 * `pilotId` y `vehicleId` no aparecen: el `PATCH` los ignora en silencio y
 * responde 200 sin aplicarlos.
 */
export const buildTripUpdatePayload = (form: TripForm & { status?: TripStatus }): TripUpdateForm => ({
    ...buildTripPayload(form),
    ...(form.status ? { status: form.status } : {}),
});

/** Los dos ids de `/assignment`, como números: una cadena es 422. */
export const buildTripAssignmentPayload = (form: TripAssignmentForm): TripAssignmentForm => ({
    pilotId: Number(form.pilotId),
    vehicleId: Number(form.vehicleId),
});

/* ------------------------------------------------------------------ *
 * Errores
 * ------------------------------------------------------------------ */

/** El 400 que responden `PATCH`, `/assignment`, `/start`, `/finish` y el segundo `DELETE`. */
export const TRIP_ALREADY_DELETED_MESSAGE = "El viaje ya fue eliminado";

/** El 403 del transportista que llega tarde: otra empresa ya se quedó el viaje. */
export const TRIP_TAKEN_MESSAGE = "No puedes asignar un viaje que ya tomó otra empresa transportista";

/** El 400 de reasignar un viaje que ya arrancó. */
export const TRIP_NOT_PENDING_MESSAGE = "Solo se puede asignar un viaje pendiente";

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
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de Laravel
 * `{ message, errors }` para el 422. En el 422 se prefieren los mensajes de
 * `errors`, que ya vienen en español y nombran el campo que falla.
 */
export const getTripErrorMessage = (error: unknown): string => {
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

/** Extrae `errors[campo]` del 422, ya aplanado a su primer mensaje. */
const collectFieldErrors = <F extends string>(errors: unknown, fields: readonly F[]): { field: F; message: string }[] => {
    if (!errors || typeof errors !== 'object') return [];

    return fields.flatMap((field) => {
        const entry = (errors as Record<string, unknown>)[field];
        const first = (Array.isArray(entry) ? entry : [entry])
            .find((value): value is string => typeof value === 'string');

        return first ? [{ field, message: first }] : [];
    });
};

export type TripFieldError = {
    field: TripField;
    message: string;
}

/** Las claves que el 422 puede traer en `errors`, tal como se enviaron. */
const TRIP_FIELDS: readonly TripField[] = [
    'order',
    'clientId',
    'shippingLineId',
    'departurePointId',
    'locationId',
    'destination',
    'container',
    'transport',
    'recolectionDate',
    'shipDate',
    'polyline',
    'observations',
    'status',
];

/**
 * Los 400 del service que **sí** pertenecen a un campo del formulario. Son los
 * que `exists:` no puede ver: la fila existe en la tabla, así que pasa la
 * validación, pero está borrada o inservible y el service la para después.
 * Sin este mapeo el usuario vería un aviso suelto sin saber qué corregir.
 *
 * Se revalidan en **cada** `PATCH`, aunque solo se mueva una fecha: si el
 * puerto se desactivó desde el alta, editar la orden responde 400.
 */
const BUSINESS_FIELD_MESSAGES: { field: TripField; message: string }[] = [
    { field: 'clientId', message: "El cliente seleccionado fue eliminado" },
    { field: 'shippingLineId', message: "La naviera seleccionada fue eliminada" },
    { field: 'locationId', message: "El destino seleccionado no es un puerto" },
    { field: 'locationId', message: "El puerto de destino está inactivo" },
    { field: 'departurePointId', message: "El punto de partida está inactivo" },
];

/**
 * Reparte el error entre los campos del formulario, cubriendo las **dos**
 * formas del backend: el 422 con las claves en `errors` y el 400 suelto en
 * `message` que hay que reconocer por el texto.
 *
 * Devuelve vacío para lo que no pertenece a ningún campo —403, 404, «ya fue
 * eliminado»—: eso se muestra como notificación.
 */
export const getTripFieldErrors = (error: unknown): TripFieldError[] => {
    const data = toAxiosError(error)?.response?.data;

    if (!data || typeof data !== 'object') return [];

    const { errors, message } = data as { errors?: unknown; message?: unknown };

    const collected = collectFieldErrors(errors, TRIP_FIELDS);

    if (collected.length > 0) return collected;

    if (typeof message !== 'string') return [];

    const business = BUSINESS_FIELD_MESSAGES.find((entry) => message.startsWith(entry.message));

    return business ? [{ field: business.field, message }] : [];
};

export type TripAssignmentFieldError = {
    field: keyof TripAssignmentForm;
    message: string;
}

/**
 * Los 400 de `/assignment` que pertenecen a uno de sus dos campos. El último no
 * es de ninguno por separado —habla de la pareja—, así que se ancla al
 * vehículo, que es el segundo que se elige.
 */
const ASSIGNMENT_FIELD_MESSAGES: TripAssignmentFieldError[] = [
    { field: 'pilotId', message: "El usuario seleccionado no es un piloto" },
    { field: 'pilotId', message: "El piloto seleccionado no pertenece a ninguna empresa transportista" },
    { field: 'vehicleId', message: "El vehículo seleccionado no está activo" },
    { field: 'vehicleId', message: "El piloto y el vehículo deben pertenecer a la misma empresa transportista" },
];

/** Mismo reparto que en el formulario del viaje, para los dos campos de la asignación. */
export const getTripAssignmentFieldErrors = (error: unknown): TripAssignmentFieldError[] => {
    const data = toAxiosError(error)?.response?.data;

    if (!data || typeof data !== 'object') return [];

    const { errors, message } = data as { errors?: unknown; message?: unknown };

    const collected = collectFieldErrors(errors, ['pilotId', 'vehicleId'] as const);

    if (collected.length > 0) return collected;

    if (typeof message !== 'string') return [];

    const business = ASSIGNMENT_FIELD_MESSAGES.find((entry) => message.startsWith(entry.message));

    return business ? [{ field: business.field, message }] : [];
};
