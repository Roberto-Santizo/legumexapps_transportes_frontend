/**
 * El resultado del costeo, en cuatro estados excluyentes: sin cotizar,
 * cotizando, con error o con cotización.
 *
 * Lo que se pinta viene tal cual de la API. El total NO se recalcula en
 * pantalla: multiplicar la tarifa ya redondeada a dos decimales se come 185
 * quetzales en un contenedor de 45 000 lb.
 */

import type { FreightQuote } from "@/features/freight-rates/freight-rates";
import {
    FreightFuelTypeTag,
    FreightPricePerPound,
    formatPounds,
    formatQuetzales,
    formatQuetzalesGrouped,
    freightBandGapRatio,
    isStaleFreightBand
} from "@/features/freight-rates/freight-rates";
import { Loader2 } from "lucide-react";

type Props = {
    quote?: FreightQuote;
    isPending: boolean;
    error: Error | null;
};

function TripQuoteShell({ children }: { children: React.ReactNode }) {
    return (
        <div className="rounded-2xl border border-line bg-canvas p-6">
            {children}
        </div>
    );
}

/**
 * El riel de banda. La distancia entre el combustible vigente y el `fuelMin` de
 * la banda aplicada es la única señal de que la tarifa lleva sin recotizarse,
 * así que se dibuja en vez de dejarla en dos cifras sueltas que nadie compara.
 */
function FreightBandRail({ currentFuelPrice, appliedFuelMin, stale }: {
    currentFuelPrice: string;
    appliedFuelMin: string;
    stale: boolean;
}) {
    const gap = freightBandGapRatio(currentFuelPrice, appliedFuelMin);

    return (
        <div className="flex flex-col gap-2">
            <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Banda aplicada
                </span>

                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Combustible vigente
                </span>
            </div>

            <div className="relative h-px w-full bg-line-strong">
                <span className="absolute -top-[3px] left-0 size-[7px] rounded-full bg-ink" />

                <span
                    className={`absolute -top-px h-px ${stale ? 'bg-primary' : 'bg-ink'}`}
                    style={{ left: 0, width: `${Math.max(gap * 100, 2)}%` }}
                />

                <span
                    className={`absolute -top-[3px] size-[7px] rounded-full ${stale ? 'bg-primary' : 'bg-ink'}`}
                    style={{ left: `calc(${Math.max(gap * 100, 2)}% - 3px)` }}
                />
            </div>

            <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[13px] tabular-nums text-ink">
                    {formatQuetzales(appliedFuelMin)}
                    <span className="ml-1 text-[10px] text-ink-subtle">/gal</span>
                </span>

                <span className={`font-mono text-[13px] tabular-nums ${stale ? 'text-primary' : 'text-ink'}`}>
                    {formatQuetzales(currentFuelPrice)}
                    <span className="ml-1 text-[10px] text-ink-subtle">/gal</span>
                </span>
            </div>
        </div>
    );
}

export function TripFreightQuoteSummary({ quote, isPending, error }: Props) {
    if (isPending) {
        return (
            <TripQuoteShell>
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 size={15} className="animate-spin text-ink-subtle" />
                    Cotizando el flete…
                </p>
            </TripQuoteShell>
        );
    }

    if (error) {
        return (
            <TripQuoteShell>
                <p className="text-sm font-medium text-danger">{error.message}</p>
            </TripQuoteShell>
        );
    }

    if (!quote) {
        return (
            <TripQuoteShell>
                <p className="text-sm text-ink-muted">
                    Elige el producto, el combustible y las libras de la carga para cotizar el flete.
                </p>
            </TripQuoteShell>
        );
    }

    const stale = isStaleFreightBand(quote.currentFuelPrice, quote.appliedFuelMin);

    return (
        <TripQuoteShell>
            <div className="flex flex-col gap-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-col gap-0.5">
                        <span className="font-display text-[15px] font-semibold uppercase tracking-tight text-ink">
                            {quote.productName ?? 'Producto sin nombre'}
                        </span>

                        <span className="text-sm text-ink-muted">
                            hacia {quote.locationName ?? 'destino sin nombre'}
                        </span>
                    </div>

                    <FreightFuelTypeTag fuelType={quote.fuelType} />
                </div>

                {quote.total !== null && (
                    <div className="flex flex-col gap-1">
                        <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                            Total del flete
                        </span>

                        <p className="font-mono text-3xl leading-none tabular-nums text-ink">
                            {formatQuetzalesGrouped(quote.total)}
                        </p>
                    </div>
                )}

                <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2 border-t border-line pt-4">
                    <FreightPricePerPound value={quote.pricePerPound} />

                    {quote.pounds !== null && (
                        <span className="font-mono text-sm tabular-nums text-ink-muted">
                            × {formatPounds(quote.pounds)} lb
                        </span>
                    )}
                </div>

                <FreightBandRail
                    currentFuelPrice={quote.currentFuelPrice}
                    appliedFuelMin={quote.appliedFuelMin}
                    stale={stale}
                />

                {stale && (
                    <p className="rounded-lg border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-ink">
                        El combustible vigente está muy por encima de la banda que se aplicó: esa tarifa
                        lleva tiempo sin recotizarse y el flete va por debajo del costo real. Revisa las
                        bandas del destino antes de cerrar el precio.
                    </p>
                )}

                <p className="text-xs text-ink-subtle">
                    Precio de hoy. La cotización no reserva ni congela la tarifa.
                </p>
            </div>
        </TripQuoteShell>
    );
}
