/**
 * El tramo entre los dos extremos, en cuatro estados excluyentes: sin datos
 * suficientes, calculando, con ruta o con error.
 *
 * De los fallos, solo el 503 se reintenta. Un 400, un 404 y un 422 fallan igual
 * las veces que se pidan: lo que hay que cambiar es un campo del formulario, no
 * la petición.
 */

import type { Directions } from "@/features/places/places";
import { DirectionsError, formatDistanceKilometers, formatDurationHours } from "@/features/places/places";
import { Loader2, RotateCw } from "lucide-react";

/** Qué hacer después del fallo, por código. El mensaje ya lo redacta el backend. */
const DIRECTIONS_HINTS: Record<number, string> = {
    400: "Ese destino está dado de baja. Elige otro para calcular la ruta.",
    404: "Cambia el punto de partida: desde ahí no hay carretera hacia el destino.",
    422: "Revisa el punto de partida y el destino antes de volver a calcular.",
    503: "Vuelve a intentarlo en unos minutos.",
};

/** Reintentar solo sirve si el fallo es transitorio. */
const isRetryable = (status: number) => status === 503 || status === 0;

type Props = {
    hasOrigin: boolean;
    hasDestination: boolean;
    directions?: Directions;
    isFetching: boolean;
    error: Error | null;
    onRetry: () => void;
};

function TripRouteShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                Ruta
            </p>

            <div className="rounded-2xl border border-line bg-canvas p-6">
                {children}
            </div>
        </div>
    );
}

export function TripRouteSummary({ hasOrigin, hasDestination, directions, isFetching, error, onRetry }: Props) {
    if (isFetching) {
        return (
            <TripRouteShell>
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 size={15} className="animate-spin text-ink-subtle" />
                    Calculando la ruta…
                </p>
            </TripRouteShell>
        );
    }

    if (error) {
        const status = error instanceof DirectionsError ? error.status : 0;
        const hint = DIRECTIONS_HINTS[status];

        return (
            <TripRouteShell>
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-danger">{error.message}</p>

                    {hint && <p className="text-sm text-ink-muted">{hint}</p>}

                    {isRetryable(status) && (
                        <button
                            type="button"
                            onClick={onRetry}
                            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            <RotateCw size={14} />
                            Reintentar
                        </button>
                    )}
                </div>
            </TripRouteShell>
        );
    }

    if (!directions) {
        return (
            <TripRouteShell>
                <p className="text-sm text-ink-muted">
                    {!hasOrigin && !hasDestination && "Elige el punto de partida y el destino para calcular la ruta."}
                    {hasOrigin && !hasDestination && "Elige el destino para calcular la ruta."}
                    {!hasOrigin && hasDestination && "Busca el punto de partida para calcular la ruta."}
                </p>
            </TripRouteShell>
        );
    }

    return (
        <TripRouteShell>
            <div className="flex flex-col gap-5">
                <div className="flex items-center gap-3">
                    <span className="size-2.5 shrink-0 rounded-full bg-ink" />
                    <span className="h-px flex-1 border-t border-dashed border-line-strong" />
                    <span className="size-2.5 shrink-0 bg-primary" />
                </div>

                <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                    <span className="text-sm text-ink-muted">Punto de partida</span>
                    <span className="text-sm font-medium text-ink">{directions.locationName}</span>
                </div>

                <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                    <p className="font-mono text-3xl leading-none text-ink">
                        {formatDistanceKilometers(directions.distanceKilometers)}
                    </p>

                    <p className="font-mono text-3xl leading-none text-ink-muted">
                        ~{formatDurationHours(directions.durationHours)}
                    </p>
                </div>

                <p className="text-xs text-ink-muted">
                    Estimación por carretera, sin tráfico.
                </p>
            </div>
        </TripRouteShell>
    );
}
