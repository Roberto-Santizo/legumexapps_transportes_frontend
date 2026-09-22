/**
 * El relato del viaje, contado **desde las fechas y no desde `status`**.
 *
 * Es la regla que gobierna todo el dominio: no hay máquina de estados y el
 * administrador mueve la etiqueta a mano en cualquier orden, así que un
 * `finished` puede volver a `pending` conservando sus dos fechas de ejecución.
 * Cuando el estado y las fechas se contradicen, las fechas son lo que de verdad
 * pasó; la etiqueta solo dice lo que alguien tecleó.
 *
 * Las cuatro paradas se leen en dos registros distintos, y esa es la única
 * decoración que hay: lo **planificado** —recolección y embarque, que teclea el
 * administrador— va en anillo hueco sobre trazo discontinuo; lo **ejecutado**
 * —arranque y cierre, que ponen el `now()` del servidor cuando el piloto pulsa—
 * va en punto sólido. La línea deja de ser una promesa exactamente donde el
 * viaje empezó a ocurrir.
 */

import type { Trip } from "@/features/trips/trips";
import { TRIP_STATUS_LABELS, daysBetweenMoments, formatTripMoment } from "@/features/trips/trips";
import { TriangleAlert } from "lucide-react";

type Stop = {
    label: string;
    /** Qué es esta parada: una intención o un hecho. */
    kind: "planned" | "executed";
    value: string | null;
    /** Qué decir mientras la parada no ha ocurrido. */
    pending: string;
};

/**
 * Lo que las fechas desmienten de la etiqueta. Devuelve `null` cuando las dos
 * versiones coinciden, que es lo normal.
 */
const describeContradiction = ({ status, startDate, endDate }: Trip): string | null => {
    if (status === 'finished' && endDate === null) {
        return "Está marcado como finalizado, pero no tiene cierre registrado: nadie pulsó «Finalizar viaje».";
    }

    if (status === 'in_route' && startDate === null) {
        return "Está marcado en ruta, pero no tiene arranque registrado: nadie pulsó «Iniciar viaje».";
    }

    if (status === 'pending' && startDate !== null) {
        return "Está marcado como pendiente, pero ya arrancó: la etiqueta se movió hacia atrás y las fechas de ejecución se conservaron.";
    }

    if (status !== 'finished' && endDate !== null) {
        return `Tiene cierre registrado, pero la etiqueta dice «${TRIP_STATUS_LABELS[status]}»: alguien la movió después de finalizarlo.`;
    }

    return null;
};

type Props = {
    trip: Trip;
}

export function TripTimeline({ trip }: Props) {
    const stops: Stop[] = [
        {
            label: "Recolección",
            kind: "planned",
            value: trip.recolectionDate,
            pending: "Sin planificar"
        },
        {
            label: "Embarque",
            kind: "planned",
            value: trip.shipDate,
            pending: "Sin planificar"
        },
        {
            label: "Arranque",
            kind: "executed",
            value: trip.startDate,
            pending: "El piloto todavía no lo ha iniciado"
        },
        {
            label: "Cierre",
            kind: "executed",
            value: trip.endDate,
            pending: "El piloto todavía no lo ha cerrado"
        },
    ];

    const contradiction = describeContradiction(trip);

    /** Cuánto se desvió el arranque real de la recolección planificada. */
    const drift = daysBetweenMoments(trip.recolectionDate, trip.startDate);

    return (
        <div className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                    Cómo va el viaje
                </h2>

                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Planificado · Ejecutado
                </p>
            </div>

            <ol className="flex flex-col">
                {stops.map((stop, index) => {
                    const done = Boolean(stop.value);
                    const isLast = index === stops.length - 1;

                    return (
                        <li key={stop.label} className="flex gap-4">
                            {/* El riel: hueco mientras es promesa, sólido cuando ya ocurrió. */}
                            <div aria-hidden className="flex flex-col items-center">
                                <span
                                    className={[
                                        "mt-1 size-2.5 shrink-0 rounded-full border-2",
                                        done
                                            ? stop.kind === "executed"
                                                ? "border-ink bg-ink"
                                                : "border-ink-subtle bg-ink-subtle"
                                            : "border-line-strong bg-surface"
                                    ].join(' ')}
                                />

                                {!isLast && (
                                    <span
                                        className={[
                                            "w-px flex-1",
                                            done && stops[index + 1].value
                                                ? "bg-line-strong"
                                                : "border-l border-dashed border-line-strong"
                                        ].join(' ')}
                                    />
                                )}
                            </div>

                            <div className={`flex flex-col gap-0.5 ${isLast ? '' : 'pb-6'}`}>
                                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                    {stop.label}
                                    {stop.kind === "executed" && " · real"}
                                </span>

                                {stop.value ? (
                                    <span className="font-mono text-[13px] text-ink">
                                        {formatTripMoment(stop.value, true)}
                                    </span>
                                ) : (
                                    <span className="text-sm text-ink-subtle">{stop.pending}</span>
                                )}
                            </div>
                        </li>
                    );
                })}
            </ol>

            {drift !== null && drift !== 0 && (
                <p className="text-sm text-ink-muted">
                    Arrancó {Math.abs(drift)} {Math.abs(drift) === 1 ? "día" : "días"}{' '}
                    {drift > 0 ? "después" : "antes"} de la recolección planificada.
                </p>
            )}

            {contradiction && (
                <p className="flex items-start gap-2.5 rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-ink">
                    <TriangleAlert size={15} className="mt-0.5 shrink-0 text-primary" />
                    {contradiction}
                </p>
            )}
        </div>
    );
}
