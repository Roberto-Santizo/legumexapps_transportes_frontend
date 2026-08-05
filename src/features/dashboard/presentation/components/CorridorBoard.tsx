import { COLD_CHAIN_RANGE, CORRIDOR_STATIONS, CORRIDOR_TRIPS, PanelShell, type TripStatus } from "@/features/dashboard/dashboard";
import { motion, useReducedMotion } from "framer-motion";

const GRID = "grid gap-x-6 gap-y-3 sm:grid-cols-[11rem_minmax(0,1fr)_7rem]";

const TRACK_COLOR: Record<TripStatus, string> = {
    en_ruta: "bg-ink",
    alerta: "bg-primary",
    detenido: "bg-danger",
};

const STATUS_LABEL: Record<TripStatus, string> = {
    en_ruta: "En ruta",
    alerta: "Alerta de frío",
    detenido: "Detenido",
};

/** Los extremos del corredor se anclan al borde para no salirse del carril. */
function anchor(index: number, total: number) {
    if (index === 0) return "translateX(0)";
    if (index === total - 1) return "translateX(-100%)";
    return "translateX(-50%)";
}

function StatusKey() {
    return (
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {(Object.keys(STATUS_LABEL) as TripStatus[]).map((status) => (
                <li key={status} className="flex items-center gap-2">
                    <span className={`size-2 rounded-full ${TRACK_COLOR[status]}`} />

                    <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                        {STATUS_LABEL[status]}
                    </span>
                </li>
            ))}
        </ul>
    );
}

export function CorridorBoard() {
    const reduceMotion = useReducedMotion();

    return (
        <PanelShell
            eyebrow="Corredor en vivo"
            title="Dónde va la carga ahora mismo"
            description="Cada carril es un furgón entre la finca y el puerto. La posición del nodo es el avance reportado por el piloto."
            aside={<StatusKey />}
        >
            <div className="px-6 pb-6 pt-5">
                <div className={`${GRID} pb-4`}>
                    <span className="hidden sm:block" />

                    <div className="relative h-4">
                        {CORRIDOR_STATIONS.map((station, index) => (
                            <span
                                key={station.label}
                                className="absolute top-0 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle"
                                style={{
                                    left: `${station.position}%`,
                                    transform: anchor(index, CORRIDOR_STATIONS.length),
                                }}
                            >
                                {station.label}
                            </span>
                        ))}
                    </div>

                    <span className="hidden sm:block" />
                </div>

                <ul className="divide-y divide-line border-y border-line">
                    {CORRIDOR_TRIPS.map((trip, index) => {
                        const outOfRange =
                            trip.celsius < COLD_CHAIN_RANGE.min || trip.celsius > COLD_CHAIN_RANGE.max;

                        return (
                            <li key={trip.plate} className={`${GRID} items-center py-4`}>
                                <div className="min-w-0">
                                    <p className="font-mono text-[13px] font-medium tracking-[0.08em] text-ink">
                                        {trip.plate}
                                    </p>

                                    <p className="mt-1 truncate text-xs text-ink-muted">
                                        {trip.product} · {trip.carrier}
                                    </p>
                                </div>

                                <div className="relative h-8">
                                    {CORRIDOR_STATIONS.map((station) => (
                                        <span
                                            key={station.label}
                                            className="absolute inset-y-0 w-px bg-line"
                                            style={{ left: `${station.position}%` }}
                                            aria-hidden
                                        />
                                    ))}

                                    <div className="absolute inset-x-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full bg-line" />

                                    <motion.div
                                        className={`absolute left-0 top-1/2 h-[3px] -translate-y-1/2 rounded-full ${TRACK_COLOR[trip.status]}`}
                                        initial={{ width: reduceMotion ? `${trip.progress}%` : 0 }}
                                        animate={{ width: `${trip.progress}%` }}
                                        transition={{
                                            duration: reduceMotion ? 0 : 0.9,
                                            delay: reduceMotion ? 0 : 0.15 + index * 0.09,
                                            ease: [0.22, 1, 0.36, 1],
                                        }}
                                    >
                                        <span className="absolute right-0 top-1/2 block size-3 -translate-y-1/2 translate-x-1/2">
                                            {trip.status === "en_ruta" && (
                                                <span className="route_node_active absolute inset-0 rounded-full" aria-hidden />
                                            )}

                                            <span
                                                className={`absolute inset-0 rounded-full ring-4 ring-surface ${TRACK_COLOR[trip.status]}`}
                                            />
                                        </span>
                                    </motion.div>

                                    <span className="sr-only">
                                        {`${trip.progress} % del corredor recorrido · ${STATUS_LABEL[trip.status]}`}
                                    </span>
                                </div>

                                <div className="sm:text-right">
                                    <p className="font-mono text-[13px] text-ink">
                                        {trip.eta}
                                    </p>

                                    <p
                                        className={`mt-1 font-mono text-[11px] tracking-[0.08em] ${outOfRange ? "text-danger" : "text-ink-subtle"}`}
                                    >
                                        {trip.celsius.toFixed(1)} °C
                                    </p>
                                </div>
                            </li>
                        );
                    })}
                </ul>

                <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                    Hora estimada de llegada al puerto · rango de carga {COLD_CHAIN_RANGE.min}–{COLD_CHAIN_RANGE.max} °C
                </p>
            </div>
        </PanelShell>
    );
}
