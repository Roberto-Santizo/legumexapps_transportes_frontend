import {
    MonthlyBars,
    PanelError,
    PanelShell,
    PanelSkeleton,
    RankedList,
    fillMonths,
    formatInteger,
    type DashboardDateRange,
    type TripsSummary
} from "@/features/dashboard/dashboard";

type Props = {
    summary?: TripsSummary;
    range: DashboardDateRange;
    carrierFiltered: boolean;
    isLoading: boolean;
    error?: Error | null;
    onRetry: () => void;
};

const TRIPS_COLOR = "#56685e";

/**
 * Lo que `/dashboard/trips` cuenta más allá de los contadores: el ritmo por
 * mes y quién concentra los viajes. Los cuatro desgloses llegan completos y
 * ordenados; aquí solo se recortan.
 */
export function TripsSummaryPanel({ summary, range, carrierFiltered, isLoading, error, onRetry }: Props) {
    const points = summary ? fillMonths(summary.byMonth, range) : [];
    const total = summary?.total ?? 0;

    /** La suma de `byCarrier` no llega a `total` cuando hay viajes sin asignar: no es un error. */
    const unassignedNote = summary && summary.unassigned > 0 && !carrierFiltered
        ? `${formatInteger(summary.unassigned)} sin asignar no tienen empresa todavía`
        : undefined;

    return (
        <PanelShell
            eyebrow="Viajes"
            title="Ritmo y concentración"
            description="Viajes por mes de recolección y quién los concentra en el periodo elegido."
        >
            <div className="px-6 pb-6 pt-5">
                {isLoading && !summary && <PanelSkeleton rows={6} />}

                {error && <PanelError message={error.message} onRetry={onRetry} />}

                {summary && (
                    <div className="flex flex-col gap-8">
                        <MonthlyBars
                            points={points}
                            dataKey="total"
                            color={TRIPS_COLOR}
                            formatValue={(value) => `${formatInteger(value)} ${value === 1 ? "viaje" : "viajes"}`}
                        />

                        <div className="grid gap-8 md:grid-cols-2">
                            <RankedList
                                heading="Por cliente"
                                total={total}
                                emptyText="Sin viajes en el periodo"
                                rows={summary.byClient.map((row) => ({ id: row.clientId, label: row.clientName, value: row.total }))}
                            />

                            <RankedList
                                heading="Por destino"
                                total={total}
                                emptyText="Sin viajes en el periodo"
                                rows={summary.byLocation.map((row) => ({ id: row.locationId, label: row.locationName, value: row.total }))}
                            />

                            <RankedList
                                heading="Por naviera"
                                total={total}
                                emptyText="Sin viajes en el periodo"
                                rows={summary.byShippingLine.map((row) => ({ id: row.shippingLineId, label: row.shippingLineName, value: row.total }))}
                            />

                            <RankedList
                                heading="Por empresa transportista"
                                total={total}
                                emptyText="Sin viajes asignados en el periodo"
                                footnote={unassignedNote}
                                rows={summary.byCarrier.map((row) => ({ id: row.carrierId, label: row.carrierName, value: row.total }))}
                            />
                        </div>
                    </div>
                )}
            </div>
        </PanelShell>
    );
}
