/**
 * Piezas de lectura de una banda. Lo que distingue a una tarifa de otra no es
 * su id sino el tramo de precio de combustible que cubre, y ese tramo no está
 * en la fila: el techo lo marca la siguiente banda del mismo par. Por eso el
 * umbral se pinta con su techo al lado, calculado aquí y en ningún otro sitio.
 */

import { FREIGHT_FUEL_TYPE_LABELS, formatQuetzales, splitPricePerPound } from "@/features/freight-rates/freight-rates";

type FuelTypeProps = {
    fuelType: string;
}

export function FreightFuelTypeTag({ fuelType }: FuelTypeProps) {
    return (
        <span className="inline-flex items-center rounded-full border border-line px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted">
            {FREIGHT_FUEL_TYPE_LABELS[fuelType] ?? fuelType}
        </span>
    );
}

type ThresholdProps = {
    fuelMin: string;
    /** Umbral de la banda siguiente, si existe. Es el techo real de esta. */
    nextFuelMin: string | null;
    /** La banda más barata del par también cubre todo lo que quede por debajo. */
    isBase: boolean;
}

export function FreightBandThreshold({ fuelMin, nextFuelMin, isBase }: ThresholdProps) {
    const ceiling = nextFuelMin
        ? `por debajo de ${formatQuetzales(nextFuelMin)}`
        : "sin techo";

    return (
        <div className="flex flex-col gap-0.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {isBase ? "Banda base" : "Desde"}
            </span>

            <span className="font-mono text-[15px] tabular-nums text-ink">
                {formatQuetzales(fuelMin)}
                <span className="ml-1 text-[11px] text-ink-subtle">/gal</span>
            </span>

            <span className="text-[11px] text-ink-subtle">
                {isBase && !nextFuelMin ? "cualquier precio" : ceiling}
            </span>
        </div>
    );
}

type PriceProps = {
    /** Seis decimales. Los cuatro últimos se atenúan, pero se muestran: son los que cambian el total. */
    value: string;
}

export function FreightPricePerPound({ value }: PriceProps) {
    const { head, tail } = splitPricePerPound(value);

    return (
        <span className="font-mono tabular-nums text-ink">
            <span className="text-[17px]">Q{head}</span>
            <span className="text-[17px] text-ink-subtle">{tail}</span>
            <span className="ml-1 text-[11px] text-ink-subtle">/lb</span>
        </span>
    );
}

type ProvenanceProps = {
    registeredByName: string | null;
    /** Llega como `d-m-Y h:i:s A`, no como ISO: se muestra tal cual, sin parsear. */
    updatedAt: string | null;
}

export function FreightRateProvenance({ registeredByName, updatedAt }: ProvenanceProps) {
    const [date] = (updatedAt ?? '').trim().split(/\s+/);

    return (
        <div className="flex flex-col gap-0.5 text-right">
            <span className="text-[11px] text-ink-muted">{registeredByName ?? '—'}</span>
            <span className="font-mono text-[11px] text-ink-subtle">{date || '—'}</span>
        </div>
    );
}
