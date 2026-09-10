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
import type { LatLng, TripAssignmentForm, TripAssignmentFormValues, TripField, TripFilters, TripForm, TripFuel, TripFuelForm, TripListItem, TripPosition, TripStatus, TripTimeout, TripUpdateForm } from "@/features/trips/trips";
import { FUEL_TYPES, FUEL_TYPE_LABELS } from "@/features/fuel-prices/fuel-prices";
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

/**
 * Mirar el rastro es de todos **menos del piloto**, que recibe 403 tanto en el
 * `GET` como al suscribirse al canal —también sobre su propio viaje: su
 * aplicación ya conoce su posición—. Es la inversa exacta de `canRunTrips`.
 *
 * Esconder la opción es cortesía, no seguridad: el ámbito lo cierra el
 * servidor, y un `carrier` fuera del suyo recibe 403 aunque llegue a la URL a
 * mano.
 */
export const canTrackTrips = (role?: string): boolean =>
    role === 'administrator' || role === 'manager' || role === 'carrier';

/**
 * Solo un viaje en ruta tiene algo que seguir. Uno `pending` no ha reportado
 * nunca y uno `finished` ya no reportará: sus rastros se pueden leer, pero
 * ninguno se mueve, y ofrecer «seguimiento en vivo» ahí sería mentir.
 */
export const canTrackTrip = (trip: Pick<TripListItem, 'status'>): boolean => trip.status === 'in_route';

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

/**
 * Solo la hora del momento. Sirve donde la fecha ya la dijo la línea de al lado
 * —el cierre de una parada frente a su inicio— y repetirla solo estorbaría.
 */
export const formatTripClock = (value: string): string => {
    const date = parseTripMoment(value);

    return date ? timeFormatter.format(date) : value;
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

/**
 * Los **cuatro** campos de `/assignment`, con los tres numéricos como números:
 * una cadena en los ids es 422.
 *
 * Los galones sí admiten decimales —el input los da como cadena— y van con
 * `Number`, no con `parseInt`: `45.5` es una carga legítima.
 */
export const buildTripAssignmentPayload = (form: TripAssignmentFormValues): TripAssignmentForm => ({
    pilotId: Number(form.pilotId),
    vehicleId: Number(form.vehicleId),
    fuelGallons: Number(form.fuelGallons),
    /** Vacío no llega aquí: el `required` del select lo para antes. */
    fuelType: form.fuelType!,
});

/** Los dos campos del alta de una carga. `gallons` viaja como número. */
export const buildTripFuelPayload = (form: TripFuelForm): TripFuelForm => ({
    gallons: Number(form.gallons),
    fuelType: form.fuelType,
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

/** Mismo reparto que en el formulario del viaje, para los cuatro campos de la asignación. */
export const getTripAssignmentFieldErrors = (error: unknown): TripAssignmentFieldError[] => {
    const data = toAxiosError(error)?.response?.data;

    if (!data || typeof data !== 'object') return [];

    const { errors, message } = data as { errors?: unknown; message?: unknown };

    const collected = collectFieldErrors(errors, ['pilotId', 'vehicleId', 'fuelGallons', 'fuelType'] as const);

    if (collected.length > 0) return collected;

    if (typeof message !== 'string') return [];

    const business = ASSIGNMENT_FIELD_MESSAGES.find((entry) => message.startsWith(entry.message));

    return business ? [{ field: business.field, message }] : [];
};

/* ------------------------------------------------------------------ *
 * Rastro en vivo
 * ------------------------------------------------------------------ */

/**
 * Las coordenadas del rastro llegan como **cadenas** de ocho decimales, no como
 * números —al revés que los `points` del viaje, que la API ya devuelve
 * decodificados—. Este es el único sitio donde se convierten.
 */
export const toTripLatLng = (position: Pick<TripPosition, 'latitude' | 'longitude'>): LatLng =>
    [parseFloat(position.latitude), parseFloat(position.longitude)];

/**
 * La clave con la que se deduplica un punto, y la razón de que no sea el `id`.
 *
 * Al abrir el mapa hay una costura: primero se escucha el canal y después se
 * pide el rastro acumulado, así que el punto que ocurre entre las dos cosas
 * llega **dos veces**. La documentación dice que se deduplique por `id`, pero
 * **el payload del websocket no manda `id`** —trae `tripId` y `pilotName` en su
 * lugar—, así que por ahí no se puede.
 *
 * La clave compuesta sí funciona: `recordedAt` la pone el `now()` del servidor
 * y el piso de quince segundos garantiza que dos puntos distintos del mismo
 * viaje nunca compartan segundo. Las dos coordenadas entran para no depender de
 * eso en exclusiva.
 *
 * Se comparan como cadenas **a propósito**: las dos vienen del mismo servidor
 * con el mismo formato. Eso vale para reconocer un duplicado, nunca para
 * decidir si el camión se movió —un camión parado reporta el mismo punto una y
 * otra vez, y son puntos legítimos—.
 */
export const tripPositionKey = (position: Pick<TripPosition, 'latitude' | 'longitude' | 'recordedAt'>): string =>
    `${position.recordedAt ?? ''}|${position.latitude}|${position.longitude}`;

/**
 * Funde el rastro que ya se tenía con lo que acaba de llegar, sea del `GET` o
 * del canal, descartando lo repetido y conservando el orden ascendente por
 * `recordedAt` que la API ya garantiza.
 *
 * Devuelve **siempre un array nuevo**: el React Compiler no repinta un array
 * mutado en el sitio y el mapa se quedaría quieto.
 */
export const mergeTripPositions = (current: TripPosition[], incoming: TripPosition[]): TripPosition[] => {
    if (incoming.length === 0) return current;

    const seen = new Set(current.map(tripPositionKey));
    const added = incoming.filter((position) => {
        const key = tripPositionKey(position);

        if (seen.has(key)) return false;

        seen.add(key);

        return true;
    });

    return added.length > 0 ? [...current, ...added] : current;
};

/** El 403 que responde el canal —y el `GET`— a cualquier piloto. */
export const TRIP_POSITIONS_FORBIDDEN_MESSAGE = "No tienes permisos para consultar el rastro de un viaje";

/* ------------------------------------------------------------------ *
 * Cargas de combustible
 * ------------------------------------------------------------------ */

/**
 * El catálogo sale de `fuel-prices` porque es **el mismo enum del backend** y
 * tenerlo dos veces garantiza que un día se separen. Aquí no es una llave
 * foránea: una carga puede declarar un tipo que no tiene precio vigente, y este
 * dominio no guarda ningún precio ni da ninguna cifra en quetzales.
 */
export const TRIP_FUEL_TYPES: Option[] = FUEL_TYPES;

/** El enum crudo traducido. La API lo devuelve en inglés y sin traducir. */
export const TRIP_FUEL_TYPE_LABELS: Record<string, string> = FUEL_TYPE_LABELS;

/**
 * Registrar cargas es solo de `carrier`, y con empresa registrada: sin ella el
 * service responde 403 «No perteneces a ninguna empresa transportista». **Ni el
 * administrador ni el `manager` pueden cargar por ninguna ruta.**
 */
export const canRegisterTripFuels = (role?: string, carrierId?: number | null): boolean =>
    role === 'carrier' && typeof carrierId === 'number';

/**
 * Leer las cargas lo pueden los cuatro roles, **incluido el piloto asignado**
 * —al revés que el rastro, que a todo piloto le responde 403—: el dato es sobre
 * él y lo necesita para confirmarlo desde su aplicación.
 */
export const canReadTripFuels = (role?: string): boolean => Boolean(role);

/**
 * Sobre qué viaje se puede cargar. Dos condiciones, y las dos son del servidor:
 *
 * - **Tiene que estar tomado.** Sobre la bolsa libre el `POST` responde 403
 *   aunque el listado sí se lea: una carga que ningún piloto puede confirmar
 *   nacería atascada. Sin `pilotId` en el listado, la tripulación es lo que
 *   delata que el viaje ya tiene dueño.
 * - **No puede estar finalizado.** `pending` e `in_route` sí —una recarga en
 *   carretera es el caso real—; `finished` responde 400.
 */
export const canRegisterTripFuel = (trip: Pick<TripListItem, 'status' | 'pilotName'>): boolean =>
    trip.pilotName !== null && trip.status !== 'finished';

/**
 * Los galones llegan como **cadena** de dos decimales, nunca como número. Este
 * es el único sitio donde se convierten, y se hace con `parseFloat` porque
 * `Number("")` es `0` y disimularía una respuesta rota.
 */
export const parseGallons = (gallons: string): number => {
    const value = parseFloat(gallons);

    return Number.isNaN(value) ? 0 : value;
};

const gallonsFormatter = new Intl.NumberFormat('es-GT', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
});

/** Los galones ya agrupados por millares, para pintarlos. Sin unidad: esa la pone la UI. */
export const formatGallons = (gallons: string | number): string =>
    gallonsFormatter.format(typeof gallons === 'string' ? parseGallons(gallons) : gallons);

/** Suma los galones de las cargas que **todavía no confirmó** el piloto. */
export const sumPendingGallons = (fuels: TripFuel[]): number =>
    fuels.reduce((total, fuel) => fuel.isConfirmed ? total : total + parseGallons(fuel.gallons), 0);

/** El 403 del `POST` sobre un viaje ajeno o sobre la bolsa libre. */
export const TRIP_FUEL_FOREIGN_MESSAGE = "No puedes registrar combustible en un viaje que no tomó tu empresa transportista";

/** El 403 del transportista que aún no registró su empresa. */
export const TRIP_FUEL_NO_CARRIER_MESSAGE = "No perteneces a ninguna empresa transportista";

/** El 400 de cargar sobre un viaje ya cerrado. */
export const TRIP_FINISHED_MESSAGE = "El viaje ya fue finalizado";

/**
 * El 400 que `/start` gana con esta spec, y que **no es un fallo del piloto**:
 * es la empresa la que tiene que registrar la carga y él quien la confirma. Una
 * carga registrada pero sin confirmar no sirve.
 */
export const TRIP_FUEL_UNCONFIRMED_MESSAGE = "Debes confirmar al menos una carga de combustible antes de iniciar el viaje";

export type TripFuelFieldError = {
    field: keyof TripFuelForm;
    message: string;
}

/**
 * Reparte el 422 del alta entre sus dos campos. El resto —403 de empresa
 * ajena, 400 de viaje finalizado, 404— no pertenece a ningún campo y se muestra
 * como notificación.
 */
export const getTripFuelFieldErrors = (error: unknown): TripFuelFieldError[] => {
    const data = toAxiosError(error)?.response?.data;

    if (!data || typeof data !== 'object') return [];

    return collectFieldErrors((data as { errors?: unknown }).errors, ['gallons', 'fuelType'] as const);
};

/* ------------------------------------------------------------------ *
 * Paradas (tiempos muertos)
 * ------------------------------------------------------------------ */

/**
 * Quién puede mirar las paradas: los mismos que el rastro, es decir **todos
 * menos el piloto** —también sobre su propio viaje—. Esconder la opción es
 * cortesía, no seguridad: el ámbito lo cierra el servidor con un 403.
 */
export const canReadTripTimeouts = (role?: string): boolean => canTrackTrips(role);

/**
 * La parada sigue abierta: el camión seguía quieto en su último punto
 * reportado. No hay `status` que mirar, el estado es ese `null` —y con él
 * `durationMinutes` también es `null`—.
 *
 * Ojo: una parada abierta **no significa que el camión siga parado ahora**. Si
 * el piloto dejó de reportar y nadie finalizó el viaje, se queda abierta
 * indefinidamente: no hay job de cierre por inactividad.
 */
export const isTripTimeoutOpen = (timeout: Pick<TripTimeout, 'endedAt'>): boolean => timeout.endedAt === null;

/**
 * La cerró el `/finish` del viaje y no un punto en movimiento. Es la **única**
 * forma de distinguir las dos causas de cierre —no existe ningún `closeReason`—
 * y no se puede leer de la hora.
 */
export const isTripTimeoutClosedByFinish = (timeout: Pick<TripTimeout, 'endedAt' | 'endPositionId'>): boolean =>
    timeout.endedAt !== null && timeout.endPositionId === null;

/**
 * Lo que lleva parada una parada abierta, contra el reloj **del navegador**. Es
 * una estimación —la hora de la API es la del servidor— y por eso no sustituye
 * a `durationMinutes`: solo sirve para pintar una parada en curso.
 */
export const elapsedTimeoutMinutes = (timeout: Pick<TripTimeout, 'startedAt'>): number | null => {
    const start = parseTripMoment(timeout.startedAt);

    if (!start) return null;

    return Math.max(0, (Date.now() - start.getTime()) / 60_000);
};

/**
 * Los umbrales del filtro de la ficha. **No son del backend**: no hay ningún
 * query param de duración mínima y el servidor registra toda parada, semáforos
 * incluidos. Filtrar el ruido es del front, y por eso el umbral se enseña como
 * un control y no se aplica a escondidas.
 */
export const TRIP_TIMEOUT_THRESHOLDS: { value: number; label: string }[] = [
    { value: 0, label: "Todas" },
    { value: 1, label: "1 min" },
    { value: 5, label: "5 min" },
    { value: 15, label: "15 min" },
];

/**
 * Quita las paradas por debajo del umbral. **Las abiertas nunca se filtran**:
 * su `durationMinutes` es `null` porque sigue corriendo, no porque sea corta, y
 * esconder la parada en curso sería esconder justo el estado actual.
 */
export const filterTripTimeouts = (timeouts: TripTimeout[], minMinutes: number): TripTimeout[] => {
    if (minMinutes <= 0) return timeouts;

    return timeouts.filter((timeout) => isTripTimeoutOpen(timeout) || (timeout.durationMinutes ?? 0) >= minMinutes);
};

/**
 * El tiempo parado del viaje. Lo suma el front: **la API no da ningún total**.
 * Solo entra lo cerrado —una parada abierta no tiene duración— así que el
 * número se queda corto mientras el camión siga quieto.
 */
export const sumTimeoutMinutes = (timeouts: TripTimeout[]): number =>
    timeouts.reduce((total, timeout) => total + (timeout.durationMinutes ?? 0), 0);

/** Los minutos de la parada más larga ya cerrada, o `0` si no hay ninguna. */
export const longestTimeoutMinutes = (timeouts: TripTimeout[]): number =>
    timeouts.reduce((longest, timeout) => Math.max(longest, timeout.durationMinutes ?? 0), 0);

const minutesFormatter = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });

/**
 * Los minutos en la unidad con la que se habla de ellos: los segundos para un
 * semáforo, los minutos para una espera, las horas para una cola de puerto.
 * Pintar `154.3 min` obligaría a dividir de cabeza justo en el caso que importa.
 */
export const formatTimeoutDuration = (minutes: number): string => {
    if (minutes < 1) return `${Math.round(minutes * 60)} s`;

    if (minutes < 60) return `${minutesFormatter.format(minutes)} min`;

    const hours = Math.floor(minutes / 60);
    const rest = Math.round(minutes - hours * 60);

    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

/**
 * El pin de la parada en Google Maps. Las coordenadas llegan como **cadenas**
 * de ocho decimales y aquí se mandan tal cual: el enlace no las interpreta, y
 * convertirlas solo podría perder precisión.
 */
export const timeoutMapUrl = (timeout: Pick<TripTimeout, 'latitude' | 'longitude'>): string =>
    `https://www.google.com/maps?q=${timeout.latitude},${timeout.longitude}`;

/** El 403 que responde el `GET` a cualquier piloto, incluido el asignado. */
export const TRIP_TIMEOUTS_FORBIDDEN_MESSAGE = "No tienes permisos para consultar las paradas de un viaje";
