/**
 * Dónde se quedó quieto el camión. Es lo único del viaje que **no lo escribió
 * nadie**: las paradas nacen solas cuando el piloto reporta un punto a menos de
 * cinco metros del anterior, así que aquí no hay alta, ni corrección, ni baja
 * —una parada mal detectada es historial— y tampoco websocket: lo que se ve es
 * lo que había en la última lectura.
 *
 * La sección se lee como una regla de tiempo y no como una tabla, porque la
 * pregunta que trae a alguien aquí no es «cuántas paradas hubo» sino «cuál fue
 * la larga». Por eso **la duración es el peso de la fila**: cada barra se mide
 * contra la parada más larga del viaje, y la de cuarenta minutos se ve de lejos
 * sin leer un solo número. Es la misma idea del registro de combustible, donde
 * el peso de una carga es lo que aporta al total.
 *
 * El umbral es un control a la vista y no un filtro escondido. El servidor
 * registra toda parada, semáforos incluidos, así que un tramo urbano deja
 * decenas de filas de quince segundos; esconderlas sin decirlo haría creer que
 * el viaje fue de un tirón. Lo que queda fuera se dice con su número.
 *
 * La parada abierta nunca se filtra y nunca se pinta como las demás: su
 * duración es una estimación del navegador —la API la manda en `null` a
 * propósito— y además abierta no significa parada ahora, porque si el piloto
 * deja de reportar y nadie cierra el viaje se queda así para siempre.
 */

import type { Trip, TripTimeout } from "@/features/trips/trips";
import {
    TRIP_TIMEOUT_THRESHOLDS,
    elapsedTimeoutMinutes,
    filterTripTimeouts,
    formatTimeoutDuration,
    formatTripClock,
    formatTripMoment,
    isTripTimeoutClosedByFinish,
    isTripTimeoutOpen,
    longestTimeoutMinutes,
    sumTimeoutMinutes,
    timeoutMapUrl,
    tripProvider
} from "@/features/trips/trips";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { MapPin } from "lucide-react";

type Props = {
    trip: Trip;
}

export function TripTimeoutsSection({ trip }: Props) {
    const tripId = trip.id.toString();

    /**
     * Un minuto de piso: por debajo de ahí casi todo es un semáforo. Se puede
     * bajar a «Todas», y el aviso de abajo dice siempre cuántas se están
     * dejando fuera.
     */
    const [threshold, setThreshold] = useState(1);

    /**
     * Se pide sin `limit`: llegan todas y sin metadatos. En un viaje en ruta se
     * refresca cada minuto porque **no hay ningún evento** que avise —el canal
     * de posiciones no emite nada al abrir ni al cerrar una parada—.
     */
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getTripTimeouts', tripId],
        queryFn: () => tripProvider.getTripTimeouts(tripId),
        refetchInterval: trip.status === 'in_route' ? 60_000 : false
    });

    const timeouts = data ?? [];
    const visible = filterTripTimeouts(timeouts, threshold);
    const hidden = timeouts.length - visible.length;

    /** La escala de las barras. La marca la parada más larga, no un valor fijo. */
    const longest = longestTimeoutMinutes(timeouts);
    const stoppedMinutes = sumTimeoutMinutes(timeouts);
    const openTimeout = timeouts.find(isTripTimeoutOpen);

    return (
        <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="flex flex-col gap-1">
                    <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                        Paradas en carretera
                    </h2>

                    <p className="max-w-[62ch] text-sm text-ink-muted">
                        Los tramos en que el vehículo dejó de avanzar, deducidos de las
                        posiciones que reportó el piloto. Nadie las registra a mano.
                    </p>
                </div>

                {timeouts.length > 0 && (
                    <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                            Desde
                        </span>

                        <div className="flex flex-wrap gap-1">
                            {TRIP_TIMEOUT_THRESHOLDS.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => setThreshold(option.value)}
                                    aria-pressed={threshold === option.value}
                                    className={[
                                        "cursor-pointer rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[0.14em] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20",
                                        threshold === option.value
                                            ? "bg-ink-deep text-canvas"
                                            : "border border-line text-ink-muted hover:bg-canvas"
                                    ].join(' ')}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {isLoading && (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Cargando paradas
                </p>
            )}

            {isError && (
                <p className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
                    {error.message}
                </p>
            )}

            {/*
              * Vacío no es un error, y tiene tres lecturas que la API no
              * distingue: no paró, no reportó posiciones, o es un viaje anterior
              * a la detección y nadie rellenó lo de atrás.
              */}
            {!isLoading && !isError && timeouts.length === 0 && (
                <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-sm text-ink-muted">
                    Sin paradas registradas. O el vehículo no se detuvo, o no llegó a
                    reportar posiciones.
                </p>
            )}

            {timeouts.length > 0 && (
                <>
                    <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-5">
                        <Figure
                            label="Tiempo parado"
                            value={stoppedMinutes > 0 ? formatTimeoutDuration(stoppedMinutes) : "—"}
                        />
                        <Figure label="Paradas" value={timeouts.length.toString()} />
                        <Figure
                            label="La más larga"
                            value={longest > 0 ? formatTimeoutDuration(longest) : "—"}
                        />
                    </dl>

                    {openTimeout && (
                        <p className="text-sm text-ink-muted">
                            Hay una parada abierta: el vehículo seguía quieto en el último punto
                            que reportó, y <span className="text-ink">su tiempo todavía no suma</span> al
                            total.
                        </p>
                    )}

                    <ol className="flex flex-col">
                        {visible.map((timeout) => (
                            <TripTimeoutRow key={timeout.id} timeout={timeout} longest={longest} />
                        ))}
                    </ol>

                    {hidden > 0 && (
                        <p className="text-xs text-ink-subtle">
                            {hidden === 1
                                ? "Se oculta 1 parada"
                                : `Se ocultan ${hidden} paradas`}{' '}
                            de menos de {formatTimeoutDuration(threshold)}: casi siempre son
                            semáforos y cruces.
                        </p>
                    )}
                </>
            )}
        </section>
    );
}

type FigureProps = {
    label: string;
    value: string;
}

function Figure({ label, value }: FigureProps) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </dt>

            <dd className="font-display text-2xl font-semibold tracking-tight tabular-nums text-ink">
                {value}
            </dd>
        </div>
    );
}

type RowProps = {
    timeout: TripTimeout;
    /** Los minutos de la parada más larga: es la escala de todas las barras. */
    longest: number;
}

/**
 * Una parada. La hora de inicio manda —es la del **punto anterior**, el primero
 * del reposo, no la del punto que detectó la parada— y la barra dice cuánto
 * duró comparada con la peor del viaje.
 */
function TripTimeoutRow({ timeout, longest }: RowProps) {
    const isOpen = isTripTimeoutOpen(timeout);
    const closedByFinish = isTripTimeoutClosedByFinish(timeout);

    /** Abierta, la duración la estima el navegador: la API la manda en `null`. */
    const minutes = isOpen ? elapsedTimeoutMinutes(timeout) : timeout.durationMinutes;
    const width = longest > 0 && minutes !== null
        ? Math.max(2, Math.min(100, (minutes / longest) * 100))
        : 2;

    return (
        <li className="grid grid-cols-1 gap-x-5 gap-y-2 border-t border-line py-4 sm:grid-cols-[11rem_1fr_auto] sm:items-center">
            <div className="flex flex-col gap-0.5">
                <span className="font-mono text-[13px] tabular-nums text-ink">
                    {formatTripMoment(timeout.startedAt, true)}
                </span>

                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
                    {isOpen ? "En curso" : `Hasta ${formatTripClock(timeout.endedAt!)}`}
                </span>
            </div>

            <div className="flex flex-col gap-2">
                <div className="h-1.5 w-full rounded-full bg-canvas">
                    <div
                        style={{ width: `${width}%` }}
                        className={[
                            "h-full rounded-full",
                            isOpen ? "bg-primary" : "bg-ink-deep"
                        ].join(' ')}
                    />
                </div>

                {/* Las coordenadas son las del ancla, y salen como cadena: se mandan tal cual al mapa. */}
                <a
                    href={timeoutMapUrl(timeout)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex w-fit items-center gap-1.5 font-mono text-[11px] tabular-nums text-ink-subtle underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    <MapPin size={12} aria-hidden />
                    {timeout.latitude}, {timeout.longitude}
                </a>
            </div>

            <div className="flex flex-col gap-0.5 sm:items-end">
                <span
                    className={`font-mono text-[15px] tabular-nums ${isOpen ? "text-ink-muted" : "text-ink"}`}
                >
                    {minutes === null ? "—" : formatTimeoutDuration(minutes)}
                </span>

                {isOpen && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">
                        Sin cerrar
                    </span>
                )}

                {/*
                  * `endPositionId` en null con hora de cierre es la única señal
                  * de que la cerró el fin del viaje: el vehículo no arrancó, se
                  * cerró el viaje encima.
                  */}
                {closedByFinish && (
                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
                        Cerró el viaje
                    </span>
                )}
            </div>
        </li>
    );
}
