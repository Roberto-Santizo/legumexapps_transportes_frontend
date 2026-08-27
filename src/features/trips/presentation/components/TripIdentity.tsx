/**
 * Las piezas con las que se reconoce un viaje. Un viaje de exportación se
 * identifica como se identifica en el muelle: por la **orden** y por el
 * **contenedor**, los dos en mono y en versalitas, porque los dos son
 * referencias externas que alguien coteja contra un papel.
 *
 * Ninguno de los dos es único —dos viajes pueden compartirlos— así que no
 * sirven como clave de lista: para eso está `id`.
 *
 * Los dos se pintan **tal como llegan en la respuesta**, ya recortados y en
 * mayúsculas por el backend, nunca como los tecleó el usuario.
 */

import type { TripStatus } from "@/features/trips/trips";
import { TRIP_STATUS_LABELS, formatTripMoment } from "@/features/trips/trips";

type Size = "sm" | "lg";

const ORDER_SIZES: Record<Size, string> = {
    sm: "text-[13px] tracking-[0.12em]",
    lg: "text-[15px] tracking-[0.2em]",
};

type OrderProps = {
    order: string;
    size?: Size;
}

export function TripOrder({ order, size = "sm" }: OrderProps) {
    return (
        <span className={`font-mono uppercase ${ORDER_SIZES[size]}`}>
            {order}
        </span>
    );
}

type ContainerProps = {
    container: string;
    /** En negativo cuando va sobre el panel oscuro de la ficha. */
    inverted?: boolean;
}

/**
 * El contenedor va en chapa, igual que la placa del vehículo: es el número que
 * se lee pintado en la caja, no un texto cualquiera.
 */
export function TripContainer({ container, inverted = false }: ContainerProps) {
    return (
        <span
            className={[
                "inline-block w-fit rounded-md border px-2 py-1 font-mono text-[11px] font-medium uppercase tracking-[0.18em]",
                inverted
                    ? "border-canvas/25 bg-canvas/10 text-canvas"
                    : "border-line-strong bg-canvas text-ink-deep"
            ].join(' ')}
        >
            {container}
        </span>
    );
}

/**
 * El estado es una etiqueta que alguien movió a mano: no hay máquina de
 * estados y puede contradecir a las fechas. Por eso se pinta discreto —un
 * punto y una palabra— y el relato de verdad lo cuenta `TripTimeline`.
 */
const STATUS_STYLES: Record<TripStatus, { dot: string; text: string }> = {
    pending: { dot: "bg-ink-subtle", text: "text-ink-muted" },
    in_route: { dot: "bg-primary", text: "text-ink" },
    finished: { dot: "bg-success", text: "text-success" },
};

type StatusProps = {
    status: TripStatus;
}

export function TripStatusBadge({ status }: StatusProps) {
    const style = STATUS_STYLES[status];

    return (
        <span className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] ${style.text}`}>
            <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${style.dot}`} />
            {TRIP_STATUS_LABELS[status]}
        </span>
    );
}

type MomentProps = {
    /** Llega en `d-m-Y h:i:s A`; si no encaja se pinta tal cual. */
    value: string | null;
    /** En la ficha el momento se rastrea al minuto; en la tabla basta el día. */
    withTime?: boolean;
    /** Qué decir cuando todavía no hay fecha. */
    fallback?: string;
}

export function TripMoment({ value, withTime = false, fallback = "Sin registro" }: MomentProps) {
    if (!value) return <span className="text-sm text-ink-subtle">{fallback}</span>;

    return (
        <span className="font-mono text-[13px] text-ink">
            {formatTripMoment(value, withTime)}
        </span>
    );
}

type RouteProps = {
    departurePointName: string | null;
    locationName: string | null;
    destination: string;
}

/**
 * El trayecto completo en una línea: de la planta al puerto por carretera —lo
 * que cubre la polilínea— y del puerto al extranjero por mar, que es texto
 * libre y no lo respalda ningún catálogo. El cambio de trazo marca dónde
 * termina lo que la aplicación puede dibujar.
 */
export function TripRouteLine({ departurePointName, locationName, destination }: RouteProps) {
    return (
        <span className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm">
            <span className="text-ink">{departurePointName ?? "Punto de partida no disponible"}</span>

            <span aria-hidden className="h-px w-5 bg-line-strong" />

            <span className="text-ink">{locationName ?? "Puerto no disponible"}</span>

            <span aria-hidden className="h-px w-5 border-t border-dashed border-line-strong" />

            <span className="text-ink-muted">{destination}</span>
        </span>
    );
}
