import { PanelError, formatInteger, percentOf, type TripsSummary } from "@/features/dashboard/dashboard";

type Props = {
    summary?: TripsSummary;
    isLoading: boolean;
    error?: Error | null;
    onRetry: () => void;
};

type Tile = {
    label: string;
    value: number;
    detail: string;
    accent?: boolean;
};

/**
 * Los cinco contadores de `/dashboard/trips`. `total` es la suma de las tres
 * claves de `byStatus`; `unassigned` es la bolsa libre —`pending` sin piloto
 * ni vehículo— y con una empresa seleccionada es siempre 0.
 */
export function TripsKpiStrip({ summary, isLoading, error, onRetry }: Props) {
    if (error) return <PanelError message={error.message} onRetry={onRetry} />;

    const tiles: Tile[] = summary
        ? [
            { label: "Viajes en el periodo", value: summary.total, detail: "Por fecha de recolección" },
            { label: "Pendientes", value: summary.byStatus.pending, detail: `${percentOf(summary.byStatus.pending, summary.total)} % del periodo` },
            { label: "En ruta", value: summary.byStatus.inRoute, detail: `${percentOf(summary.byStatus.inRoute, summary.total)} % del periodo` },
            { label: "Finalizados", value: summary.byStatus.finished, detail: `${percentOf(summary.byStatus.finished, summary.total)} % del periodo` },
            { label: "Sin asignar", value: summary.unassigned, detail: "Pendientes sin piloto ni unidad", accent: summary.unassigned > 0 },
        ]
        : [];

    return (
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-5">
            {isLoading && !summary
                ? Array.from({ length: 5 }, (_, index) => (
                    <div key={index} className="bg-surface px-6 py-5" aria-busy>
                        <div className="h-3 w-24 animate-pulse rounded-full bg-line" />
                        <div className="mt-4 h-8 w-16 animate-pulse rounded-lg bg-line" />
                        <div className="mt-3 h-3 w-32 animate-pulse rounded-full bg-line" />
                    </div>
                ))
                : tiles.map((tile) => (
                    <div key={tile.label} className="bg-surface px-6 py-5">
                        <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            {tile.label}
                        </dt>

                        <dd className={`mt-3 font-display text-[34px] font-semibold leading-none tracking-tight ${tile.accent ? "text-primary" : "text-ink"}`}>
                            {formatInteger(tile.value)}
                        </dd>

                        <p className="mt-2 text-xs text-ink-muted">
                            {tile.detail}
                        </p>
                    </div>
                ))}
        </dl>
    );
}
