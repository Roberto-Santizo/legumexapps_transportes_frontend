import {
    DASHBOARD_IN_ROUTE_POLL_INTERVAL,
    PanelEmpty,
    PanelError,
    PanelShell,
    PanelSkeleton,
    dashboardProvider,
    formatDashboardMoment,
    formatDashboardTime,
    formatElapsed,
    formatGallons,
    formatStoppedMinutes,
    toAmount,
    type TripInRoute
} from "@/features/dashboard/dashboard";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Fuel, MapPinOff, OctagonPause } from "lucide-react";
import { Link } from "react-router-dom";

type Props = {
    carrierId?: number;
};

const GRID = "grid gap-x-6 gap-y-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)_minmax(0,1.2fr)_9rem_8rem_minmax(8.5rem,auto)]";

const updatedFormatter = new Intl.DateTimeFormat('es-GT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

function ColumnHeaders() {
    return (
        <div className={`${GRID} hidden border-b border-line pb-3 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle lg:grid`}>
            <span>Viaje</span>
            <span>Unidad y piloto</span>
            <span>Cliente y destino</span>
            <span>Última posición</span>
            <span>Combustible</span>
            <span>Estado</span>
        </div>
    );
}

function LastPosition({ trip }: { trip: TripInRoute }) {
    if (!trip.lastPosition) {
        return (
            <span className="inline-flex items-center gap-1.5 text-xs text-ink-subtle">
                <MapPinOff size={13} />
                Sin posición todavía
            </span>
        );
    }

    const elapsed = formatElapsed(trip.lastPosition.recordedAt);

    return (
        <div>
            <p className="font-mono text-[13px] text-ink">
                {formatDashboardTime(trip.lastPosition.recordedAt)}
            </p>

            {elapsed && (
                <p className="mt-0.5 text-xs text-ink-subtle">
                    {elapsed}
                </p>
            )}
        </div>
    );
}

function FuelCell({ trip }: { trip: TripInRoute }) {
    const unconfirmed = toAmount(trip.unconfirmedFuelGallons);

    return (
        <div>
            <p className="inline-flex items-center gap-1.5 font-mono text-[13px] text-ink">
                <Fuel size={13} className="text-ink-subtle" />
                {formatGallons(trip.totalFuelGallons)}
            </p>

            {unconfirmed > 0 && (
                <p className="mt-0.5 text-xs text-primary">
                    +{formatGallons(trip.unconfirmedFuelGallons)} sin confirmar
                </p>
            )}
        </div>
    );
}

/**
 * La parada abierta pesa más que el movimiento: `stoppedMinutes` ya viene
 * calculado contra el reloj del servidor y se pinta tal cual, sin sumarle el
 * tiempo que lleva la foto en pantalla.
 */
function StateChip({ trip }: { trip: TripInRoute }) {
    if (trip.openTimeout) {
        return (
            <span
                className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-ink"
                title={`Detenido desde ${formatDashboardMoment(trip.openTimeout.startedAt)}`}
            >
                <OctagonPause size={13} />

                <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                    Detenido · {formatStoppedMinutes(trip.openTimeout.stoppedMinutes)}
                </span>
            </span>
        );
    }

    return (
        <span className="inline-flex items-center gap-2 rounded-full border border-line-strong bg-canvas px-3 py-1 text-ink-muted">
            <span className="size-2 rounded-full bg-success" />

            <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                En movimiento
            </span>
        </span>
    );
}

/**
 * La foto de los viajes `in_route`, refrescada por polling: no hay websocket
 * del tablero y el canal `trips.{tripId}` es por viaje. Cada fila enlaza al
 * seguimiento en vivo, que sí escucha el socket.
 */
export function TripsInRouteBoard({ carrierId }: Props) {
    const { data, isLoading, error, refetch, dataUpdatedAt } = useQuery({
        queryKey: ['dashboardTripsInRoute', carrierId],
        queryFn: () => dashboardProvider.getTripsInRoute({ carrierId }),
        refetchInterval: DASHBOARD_IN_ROUTE_POLL_INTERVAL,
    });

    const trips = data ?? [];
    const stopped = trips.filter((trip) => trip.openTimeout).length;

    return (
        <PanelShell
            eyebrow="En ruta ahora"
            title={data ? `${trips.length} ${trips.length === 1 ? "viaje en curso" : "viajes en curso"}` : "Viajes en curso"}
            description={stopped > 0
                ? `${stopped} ${stopped === 1 ? "unidad detenida" : "unidades detenidas"} con una parada abierta. El resto reporta movimiento.`
                : "Cada unidad que salió y todavía no llegó, con su última posición reportada."}
            aside={
                <span className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3 py-1.5 text-ink-muted">
                    <span className="relative flex size-2">
                        <span className="route_node_active absolute inset-0 rounded-full" aria-hidden />
                        <span className="absolute inset-0 rounded-full bg-primary" />
                    </span>

                    <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                        {dataUpdatedAt ? `Foto de las ${updatedFormatter.format(new Date(dataUpdatedAt))}` : "Cargando"}
                    </span>
                </span>
            }
        >
            <div className="px-6 pb-6 pt-5">
                {isLoading && !data && <PanelSkeleton rows={5} />}

                {error && <PanelError message={error.message} onRetry={() => refetch()} />}

                {data && trips.length === 0 && (
                    <PanelEmpty
                        title="No hay viajes en ruta"
                        hint="Aparecerán aquí en cuanto un piloto inicie uno."
                    />
                )}

                {trips.length > 0 && (
                    <>
                        <ColumnHeaders />

                        <ul className="divide-y divide-line">
                            {trips.map((trip) => (
                                <li key={trip.tripId} className={`${GRID} items-center py-4`}>
                                    <div className="min-w-0">
                                        <Link
                                            to={`/viajes/${trip.tripId}/seguimiento`}
                                            className="group inline-flex items-center gap-1.5 font-mono text-[13px] font-medium tracking-[0.08em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
                                        >
                                            {trip.order}
                                            <ArrowRight size={13} className="text-ink-subtle transition-transform group-hover:translate-x-0.5" />
                                        </Link>

                                        <p className="mt-1 truncate font-mono text-xs text-ink-subtle">
                                            {trip.container}
                                            {trip.startDate && ` · salió ${formatDashboardMoment(trip.startDate)}`}
                                        </p>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="font-mono text-[13px] tracking-[0.08em] text-ink">
                                            {trip.vehiclePlate ?? "Sin placa"}
                                        </p>

                                        <p className="mt-1 truncate text-xs text-ink-muted">
                                            {trip.pilotName ?? "Piloto sin nombre"}
                                            {trip.carrierName && ` · ${trip.carrierName}`}
                                        </p>
                                    </div>

                                    <div className="min-w-0">
                                        <p className="truncate text-sm text-ink">
                                            {trip.clientName ?? "Cliente sin nombre"}
                                        </p>

                                        <p className="mt-1 truncate text-xs text-ink-muted">
                                            → {trip.locationName ?? "Destino sin nombre"}
                                        </p>
                                    </div>

                                    <LastPosition trip={trip} />

                                    <FuelCell trip={trip} />

                                    <div className="lg:justify-self-end">
                                        <StateChip trip={trip} />
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </>
                )}
            </div>
        </PanelShell>
    );
}
