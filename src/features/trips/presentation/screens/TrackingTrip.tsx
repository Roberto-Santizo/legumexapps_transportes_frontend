/**
 * Dónde está el camión, ahora mismo.
 *
 * Es la única pantalla del proyecto que no se agota en HTTP: el rastro
 * acumulado llega por el `GET`, pero lo que la hace útil es el canal privado
 * `trips.{id}`, que empuja cada punto nuevo en cuanto el piloto lo reporta.
 *
 * Dos cosas se dicen aquí de forma explícita porque el backend no las dice:
 *
 * - **El estado del socket.** Si Reverb no está corriendo el fallo es
 *   silencioso por diseño —la API sigue respondiendo 201 y guardando los
 *   puntos—, así que un mapa quieto se leería como «el camión está parado». El
 *   indicador de conexión es lo que separa las dos cosas.
 * - **Que el piloto no entra.** El `GET` y el canal responden 403 a cualquier
 *   piloto, incluido el asignado a este viaje. Esconderlo es cortesía; quien
 *   llegue a la URL a mano se topa igual con el servidor.
 */

import {
    TripContainer,
    TripOrder,
    TripPageHeader,
    TripStatusBadge,
    TripTrackingMap,
    canTrackTrips,
    formatTripMoment,
    toTripLatLng,
    tripProvider,
    useTripTracking,
    type TripTrackingStatus
} from "@/features/trips/trips";
import { ErrorComponent, FadeInUp } from "@/features/shared/shared";
import { Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

/**
 * Lo que se dice de la conexión, y solo de ella: no es el estado del viaje.
 * `note` es la frase que explica qué significa un mapa que no se mueve, y solo
 * la tienen los estados en los que eso puede pasar.
 */
const CONNECTION: Record<TripTrackingStatus, { label: string; dot: string; text: string; note: string | null }> = {
    live: {
        label: "En vivo",
        dot: "bg-primary animate-pulse",
        text: "text-ink",
        note: null
    },
    connecting: {
        label: "Conectando",
        dot: "bg-ink-subtle",
        text: "text-ink-muted",
        note: null
    },
    offline: {
        label: "Sin conexión en vivo",
        dot: "bg-danger",
        text: "text-danger",
        note: "El rastro que ves es el último que guardó la API. Los puntos nuevos no están llegando."
    },
    unavailable: {
        label: "Seguimiento no configurado",
        dot: "bg-ink-subtle",
        text: "text-ink-muted",
        note: "Falta la configuración del servidor de eventos. El rastro se carga, pero no se actualiza solo."
    },
    forbidden: {
        label: "Canal rechazado",
        dot: "bg-danger",
        text: "text-danger",
        note: "El servidor no autorizó la suscripción a este viaje. El rastro ya cargado sigue siendo válido."
    },
};

type StatProps = {
    label: string;
    value: string;
}

/** La tira de datos bajo el mapa: etiqueta en versalitas, dato en mono. */
function Stat({ label, value }: StatProps) {
    return (
        <div className="flex flex-col gap-1.5 border-t border-line pt-3">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </dt>

            <dd className="font-mono text-[13px] text-ink">{value}</dd>
        </div>
    );
}

export function TrackingTrip() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const user = useSelector((state: RootState) => state.auth.user);
    const role = user?.role;

    const canTrack = canTrackTrips(role);

    const { data: trip, isLoading, isError, error } = useQuery({
        queryKey: ['getTripById', id],
        queryFn: () => tripProvider.getTripById(id!),
        enabled: Boolean(id) && canTrack
    });

    /**
     * Se escucha el canal aunque el viaje ya no esté en ruta: el estado del
     * viaje llega después que el `id`, y esperarlo abriría el hueco que este
     * orden existe para cerrar. Un viaje cerrado simplemente no emite nada.
     */
    const {
        positions,
        last,
        status,
        pilotName,
        isError: isTrackError,
        error: trackError
    } = useTripTracking(id, canTrack);

    /** La identidad de este array es lo que decide si el mapa rehace el trazo. */
    const trackPoints = useMemo(() => positions.map(toTripLatLng), [positions]);

    if (!canTrack) {
        return (
            <ErrorComponent
                message="El rastro de un viaje no está disponible para el piloto. Tu aplicación ya reporta tu posición; consultarla es cosa de quien despacha."
            />
        );
    }

    if (isError) {
        return (
            <ErrorComponent
                message={`${error.message}. Un viaje que tomó otra empresa, o que fue eliminado, deja de ser alcanzable: en los dos casos desaparece del listado y del detalle.`}
            />
        );
    }

    const connection = CONNECTION[status];
    const isRunning = trip?.status === 'in_route';

    return (
        <div className="flex flex-col gap-8">
            <TripPageHeader
                title="Seguimiento en vivo"
                subtitle="Dónde va el vehículo, punto a punto, sobre la ruta que se planificó."
            >
                <div className="flex flex-wrap items-center gap-4">
                    <span className={`inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] ${connection.text}`}>
                        <span aria-hidden className={`size-1.5 shrink-0 rounded-full ${connection.dot}`} />
                        {connection.label}
                    </span>

                    <button
                        type="button"
                        onClick={() => navigate(`/viajes/${id}`)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                    >
                        <Eye size={16} />
                        Ver detalle
                    </button>
                </div>
            </TripPageHeader>

            {connection.note && (
                <p className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-4 text-sm text-ink-muted">
                    {connection.note}
                </p>
            )}

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando viaje
                </p>
            )}

            {!isLoading && trip && (
                <FadeInUp>
                    <div className="flex flex-col gap-6">
                        {/* La misma chapa oscura de la ficha: el viaje se reconoce antes que el mapa. */}
                        <div className="flex flex-col gap-4 rounded-2xl bg-ink-deep px-7 py-8 text-canvas">
                            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                Viaje {trip.id}
                            </span>

                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div className="flex flex-col gap-3">
                                    <TripOrder order={trip.order} size="lg" />
                                    <TripContainer container={trip.container} inverted />
                                </div>

                                <TripStatusBadge status={trip.status} />
                            </div>

                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-canvas/80">
                                <span>{trip.departurePointName ?? "Punto de partida no disponible"}</span>
                                <span aria-hidden className="h-px w-6 bg-canvas/30" />
                                <span>{trip.locationName ?? "Puerto no disponible"}</span>
                                <span aria-hidden className="h-px w-6 border-t border-dashed border-canvas/30" />
                                <span>{trip.destination}</span>
                            </p>
                        </div>

                        {/* Un viaje que no está en ruta conserva su rastro, pero ya no crece. */}
                        {!isRunning && (
                            <p className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-4 text-sm text-ink-muted">
                                {trip.status === 'finished'
                                    ? "El viaje está finalizado: esto es el recorrido que quedó registrado, no una posición actual."
                                    : "El viaje todavía no arranca. Hasta que el piloto lo inicie no habrá nada que seguir."}
                            </p>
                        )}

                        <TripTrackingMap plannedPoints={trip.points} trackPoints={trackPoints} />

                        {/* La leyenda hace falta: son dos líneas y significan cosas distintas. */}
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                            <span className="inline-flex items-center gap-2">
                                <span aria-hidden className="h-px w-7 border-t-2 border-dashed border-ink/40" />
                                Ruta prevista
                            </span>

                            <span className="inline-flex items-center gap-2">
                                <span aria-hidden className="h-[3px] w-7 rounded-full bg-primary" />
                                Recorrido real
                            </span>
                        </div>

                        {/* Un rastro vacío no es un error: es un piloto que aún no ha reportado. */}
                        {positions.length === 0 && !isTrackError && (
                            <p className="rounded-xl border border-dashed border-line-strong bg-surface px-5 py-4 text-sm text-ink-muted">
                                El piloto todavía no ha reportado su posición. En cuanto lo haga, el
                                recorrido aparecerá sobre la ruta prevista.
                            </p>
                        )}

                        {isTrackError && (
                            <p className="rounded-xl border border-dashed border-danger/40 bg-surface px-5 py-4 text-sm text-danger">
                                {trackError?.message}
                            </p>
                        )}

                        <dl className="grid max-w-3xl gap-x-8 gap-y-1 sm:grid-cols-3">
                            <Stat
                                label="Último reporte"
                                value={last?.recordedAt ? formatTripMoment(last.recordedAt, true) : "Sin registro"}
                            />

                            <Stat
                                label="Reporta"
                                value={pilotName ?? trip.pilotName ?? "Sin asignar"}
                            />

                            <Stat
                                label="Puntos del rastro"
                                value={positions.length.toString()}
                            />
                        </dl>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
