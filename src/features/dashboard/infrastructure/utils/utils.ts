/**
 * Único punto del front donde los filtros del tablero se validan antes de
 * viajar, donde el periodo elegido se convierte en `dateFrom`/`dateTo`, donde
 * los meses vacíos de `byMonth` se rellenan a cero y donde el dinero, los
 * galones y las fechas `d-m-Y h:i:s A` dejan de ser cadena para pintarse.
 *
 * La trampa de este dominio: **la API no valida nada**. Un `carrierId` que no
 * existe, un `dateFrom=01/09/2026` o un `status=ACTIVE` se ignoran en
 * silencio y devuelven el histórico completo. Si el tablero muestra «todo»
 * cuando se esperaba un recorte, el fallo está en el filtro, no en la API.
 */

import type { DashboardDateRange, DashboardMonthPoint, DashboardPeriod, DashboardSummaryFilters, DashboardVehicleFilters } from "@/features/dashboard/dashboard";
import { can, type Option } from "@/features/shared/shared";
import { isAxiosError } from "axios";

/**
 * `administrator`, `manager`, `export` y `carrier` (este acotado a su empresa:
 * el filtro `carrierId` se le ignora). `pilot`, `user` y `shipment` reciben 403.
 */
export const canReadDashboard = (role?: string): boolean => can(role, 'dashboard');

/** Solo quien lee `GET /carriers` puede elegir empresa en el tablero. */
export const canFilterDashboardByCarrier = (role?: string): boolean => can(role, 'readCarriers');

/** A dónde va un rol sin tablero: la única pantalla que los siete roles comparten. */
export const DASHBOARD_FALLBACK_ROUTE = '/viajes';

/**
 * `/trips/in-route` es una foto sin websocket: se refresca por polling. El
 * número de consultas que ejecuta no depende de cuántos viajes haya, así que
 * medio minuto es un intervalo razonable y barato.
 */
export const DASHBOARD_IN_ROUTE_POLL_INTERVAL = 30_000;

export const DASHBOARD_PERIODS: { value: DashboardPeriod; label: string }[] = [
    { value: "month", label: "Este mes" },
    { value: "last30", label: "Últimos 30 días" },
    { value: "all", label: "Todo el histórico" },
];

export const DEFAULT_DASHBOARD_PERIOD: DashboardPeriod = "month";

export const isDashboardPeriod = (value: unknown): value is DashboardPeriod =>
    DASHBOARD_PERIODS.some((period) => period.value === value);

/** Las tres opciones que admite `/vehicles`, exactas y en minúsculas. */
export const DASHBOARD_VEHICLE_STATUSES: Option[] = [
    { value: "active", label: "Activos" },
    { value: "inactive", label: "Inactivos" },
    { value: "under_repair", label: "En taller" },
];

const VEHICLE_STATUS_VALUES = new Set(DASHBOARD_VEHICLE_STATUSES.map((status) => String(status.value)));
const VEHICLE_CONDITION_VALUES = new Set(["new", "used"]);

/**
 * `Y-m-d` **estricto**: `2026-9-1` o `2026-13-45` se ignoran en el servidor y
 * la respuesta vuelve con todo el histórico sin avisar. Se comprueba también
 * que la fecha exista de verdad (nada de 31 de febrero).
 */
const API_DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export const isApiDay = (value: string): boolean => {
    const parts = API_DAY_PATTERN.exec(value);

    if (!parts) return false;

    const [, year, month, day] = parts.map(Number);
    const date = new Date(year, month - 1, day);

    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
};

const pad = (value: number): string => String(value).padStart(2, '0');

/** `Y-m-d` → `Date` local a medianoche, o `null` si no es un día válido. */
export const parseApiDay = (value: string): Date | null => {
    if (!isApiDay(value)) return null;

    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, month - 1, day);
};

/** `Date` → `Y-m-d` en hora local: el tablero razona en el día del usuario, no en UTC. */
export const toApiDay = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** `Date` → `YYYY-MM`, la clave de `byMonth`. */
export const toMonthKey = (date: Date): string => `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;

/**
 * Entero positivo o nada. La API ignora `abc`, `-1` y un id inexistente, así
 * que al menos los dos primeros se paran aquí; el tercero solo lo sabe el
 * servidor y responde «todas las empresas» sin decirlo.
 */
export const toCarrierId = (value: unknown): number | undefined => {
    const id = typeof value === 'number' ? value : Number(String(value ?? '').trim());

    return Number.isInteger(id) && id > 0 ? id : undefined;
};

/**
 * El periodo elegido convertido al rango que espera la API. «Todo el
 * histórico» es no mandar fechas: la API no aplica ningún periodo por defecto.
 * `dateTo` siempre es hoy: el tablero mira hacia atrás.
 */
export const resolveDashboardRange = (period: DashboardPeriod, today = new Date()): DashboardDateRange => {
    if (period === "all") return {};

    const from = period === "month"
        ? new Date(today.getFullYear(), today.getMonth(), 1)
        : new Date(today.getFullYear(), today.getMonth(), today.getDate() - 29);

    return { dateFrom: toApiDay(from), dateTo: toApiDay(today) };
};

/**
 * Un filtro vacío o inválido no se manda: el backend lo ignoraría igual y solo
 * ensuciaría la URL. Devuelve la cadena sin `?` para poder omitirla del todo.
 */
export const buildDashboardSummaryQuery = (filters?: DashboardSummaryFilters): string => {
    const query = new URLSearchParams();
    const carrierId = toCarrierId(filters?.carrierId);

    if (carrierId) query.set('carrierId', String(carrierId));
    if (filters?.dateFrom && isApiDay(filters.dateFrom)) query.set('dateFrom', filters.dateFrom);
    if (filters?.dateTo && isApiDay(filters.dateTo)) query.set('dateTo', filters.dateTo);

    return query.toString();
};

/**
 * `limit` numérico activa la paginación y entonces `total/currentPage/lastPage`
 * llegan en la raíz; sin él la API devuelve toda la flota. `inRoute` se manda
 * como `true`/`false` literal y se aplica antes de paginar.
 */
export const buildDashboardVehiclesQuery = (filters?: DashboardVehicleFilters): string => {
    const query = new URLSearchParams();
    const carrierId = toCarrierId(filters?.carrierId);

    if (carrierId) query.set('carrierId', String(carrierId));
    if (filters?.status && VEHICLE_STATUS_VALUES.has(filters.status)) query.set('status', filters.status);
    if (filters?.condition && VEHICLE_CONDITION_VALUES.has(filters.condition)) query.set('condition', filters.condition);
    if (typeof filters?.inRoute === 'boolean') query.set('inRoute', String(filters.inRoute));

    const limit = Number(filters?.limit);

    if (Number.isInteger(limit) && limit > 0) {
        query.set('limit', String(limit));

        const page = Number(filters?.page);

        if (Number.isInteger(page) && page >= 0) query.set('page', String(page));
    }

    return query.toString();
};

/** Une la ruta con la query solo cuando hay algo que mandar. */
export const withQuery = (url: string, query: string): string => query ? `${url}?${query}` : url;

const monthLabelFormatter = new Intl.DateTimeFormat('es-GT', { month: 'short' });
const monthYearFormatter = new Intl.DateTimeFormat('es-GT', { month: 'short', year: '2-digit' });

const parseMonthKey = (key: string): Date | null => {
    const [year, month] = key.split('-').map(Number);

    if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12) return null;

    return new Date(year, month - 1, 1);
};

/** «sep» dentro del mismo año, «sep 25» cuando el eje cruza de año. */
export const formatMonthLabel = (key: string, withYear: boolean): string => {
    const date = parseMonthKey(key);

    if (!date) return key;

    const label = (withYear ? monthYearFormatter : monthLabelFormatter).format(date).replace('.', '');

    return label.charAt(0).toUpperCase() + label.slice(1);
};

/**
 * `byMonth` solo trae meses con datos. El eje se rellena a cero sobre el rango
 * pedido; sin rango (todo el histórico) va del primer mes con datos al mes en
 * curso. Un rango que no llega a hoy termina en su `dateTo`.
 */
export const fillMonths = (
    rows: { month: string; total?: number; count?: number; totalAmount?: string }[],
    range: DashboardDateRange,
    today = new Date()
): DashboardMonthPoint[] => {
    const byKey = new Map(rows.map((row) => [row.month, row]));

    const first = range.dateFrom
        ? parseMonthKey(range.dateFrom.slice(0, 7))
        : parseMonthKey(rows[0]?.month ?? toMonthKey(today));

    const last = range.dateTo ? parseMonthKey(range.dateTo.slice(0, 7)) : new Date(today.getFullYear(), today.getMonth(), 1);

    if (!first || !last || first > last) return [];

    const withYear = first.getFullYear() !== last.getFullYear();
    const points: DashboardMonthPoint[] = [];

    for (let cursor = new Date(first); cursor <= last; cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)) {
        const key = toMonthKey(cursor);
        const row = byKey.get(key);

        points.push({
            month: key,
            label: formatMonthLabel(key, withYear),
            total: row?.total ?? row?.count ?? 0,
            amount: toAmount(row?.totalAmount),
        });
    }

    return points;
};

/** `"15300.50"` → `15300.5`. Solo para calcular o graficar; lo que se pinta sale de `formatMoney`. */
export const toAmount = (value?: string | null): number => {
    const amount = Number(value);

    return Number.isFinite(amount) ? amount : 0;
};

const moneyFormatter = new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
});

const compactMoneyFormatter = new Intl.NumberFormat('es-GT', {
    style: 'currency',
    currency: 'GTQ',
    notation: 'compact',
    maximumFractionDigits: 1,
});

const integerFormatter = new Intl.NumberFormat('es-GT', { maximumFractionDigits: 0 });
const gallonsFormatter = new Intl.NumberFormat('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 2 });

/** Importe de la API (cadena) → `Q15,300.50`. */
export const formatMoney = (value: string | number): string => moneyFormatter.format(typeof value === 'number' ? value : toAmount(value));

/** Para ejes y cifras grandes: `Q15.3 mil`. */
export const formatCompactMoney = (value: number): string => compactMoneyFormatter.format(value);

export const formatInteger = (value: number): string => integerFormatter.format(value);

/** `"45.00"` → `45 gal`. */
export const formatGallons = (value: string): string => `${gallonsFormatter.format(toAmount(value))} gal`;

/** `10.25` minutos → `10 min`; a partir de la hora, `1 h 25 min`. */
export const formatStoppedMinutes = (minutes: number): string => {
    const whole = Math.max(0, Math.round(minutes));
    const hours = Math.floor(whole / 60);
    const rest = whole % 60;

    if (hours === 0) return `${rest} min`;

    return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
};

/** Porcentaje entero de `part` sobre `total`, `0` cuando no hay total. */
export const percentOf = (part: number, total: number): number => total > 0 ? Math.round((part / total) * 100) : 0;

/**
 * `d-m-Y h:i:s A` de la API → `Date`. No es ISO 8601 y `Date` no lo parsea: se
 * desarma a mano para no depender del navegador.
 */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

export const parseDashboardMoment = (value: string): Date | null => {
    const parts = MOMENT_PATTERN.exec(value.trim());

    if (!parts) return null;

    const [, day, month, year, rawHour, minute, second, meridiem] = parts;
    const hour = Number(rawHour) % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0);

    const date = new Date(Number(year), Number(month) - 1, Number(day), hour, Number(minute), Number(second));

    return Number.isNaN(date.getTime()) ? null : date;
};

const dateFormatter = new Intl.DateTimeFormat('es-GT', { day: '2-digit', month: 'short' });
const timeFormatter = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit' });

/** `14-09-2026 08:15:00 AM` → `14 sept · 08:15`. Si no encaja con el formato se pinta tal cual llegó. */
export const formatDashboardMoment = (value: string): string => {
    const date = parseDashboardMoment(value);

    if (!date) return value;

    return `${dateFormatter.format(date).replace('.', '')} · ${timeFormatter.format(date)}`;
};

/** Solo la hora, para cuando el día ya se sobreentiende (la última posición de un viaje en curso). */
export const formatDashboardTime = (value: string): string => {
    const date = parseDashboardMoment(value);

    return date ? timeFormatter.format(date) : value;
};

/**
 * «hace 5 min» respecto al reloj del cliente. Solo para `recordedAt` de la
 * última posición, que sí es un instante de la base; `stoppedMinutes` ya
 * viene calculado por el servidor y no pasa por aquí.
 */
export const formatElapsed = (value: string, now = new Date()): string | null => {
    const date = parseDashboardMoment(value);

    if (!date) return null;

    const minutes = Math.max(0, Math.round((now.getTime() - date.getTime()) / 60_000));

    if (minutes < 1) return 'ahora mismo';
    if (minutes < 60) return `hace ${minutes} min`;

    const hours = Math.floor(minutes / 60);

    if (hours < 24) return `hace ${hours} h`;

    return `hace ${Math.floor(hours / 24)} d`;
};

/**
 * El backend solo responde 401 y 403 en este dominio, siempre en el sobre
 * `{ statusCode, message, data }`. No hay 422 ni `errors`: si llega, es un bug
 * del servidor, pero se lee igual por si acaso.
 */
export const getDashboardErrorMessage = (error: unknown): string => {
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
