/**
 * La pizarra. Es lo primero que se busca al entrar: cuánto cuesta hoy el galón.
 * Se compone como el rótulo de patio de una gasolinera —campo oscuro, cifras
 * rotuladas en mono— y agrupa por surtidor (gasolina / diésel) porque esa es la
 * lectura real: lo que decide a qué manguera llega una unidad.
 */

import { FUEL_GROUPS, FUEL_TYPE_LABELS, FuelPriceFigure, type FuelPrice } from "@/features/fuel-prices/fuel-prices";

type Props = {
    /** Registros desde los que se resuelve el vigente de cada combustible. */
    prices: FuelPrice[];
}

export function FuelPriceBoard({ prices }: Props) {
    const currentPriceOf = (fuelType: string) =>
        prices.find((price) => price.fuelType === fuelType && price.status === 'active');

    return (
        <div data-impeccable-carbonize="545a2da6" style={{ display: "contents" }}>
          {/* impeccable-carbonize-start 545a2da6 */}
          <style data-impeccable-css="545a2da6">{`
          @scope ([data-impeccable-variant="1"]) {
          :scope .fp-price { font-size: calc(var(--p-price-scale, 1) * 1.875rem); }
          }
          @scope ([data-impeccable-variant="2"]) {
          :scope .fp-row { padding-block: 0.875rem; }
          :scope[data-p-density="compact"] .fp-row { padding-block: 0.5rem; }
          :scope .fp-price { font-size: 1.125rem; }
          :scope[data-p-density="compact"] .fp-price { font-size: 1rem; }
          }
          @scope ([data-impeccable-variant="3"]) {
          :scope .fp-price { font-size: calc(var(--p-price-scale, 1) * 2.25rem); }
          }
          `}</style>
          {/* impeccable-param-values 545a2da6: {"price-scale":1} */}
          {/* impeccable-carbonize-end 545a2da6 */}
          <div data-impeccable-variant="1" style={{ display: 'contents' }}>
            <section className="overflow-hidden rounded-2xl border border-line bg-surface">
                <header className="flex flex-wrap items-baseline justify-between gap-2 px-6 py-4">
                    <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                        Precios vigentes
                    </h2>
                    <p className="text-xs text-ink-muted">Quetzales por galón</p>
                </header>

                <dl className="grid grid-cols-1 gap-px border-t border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
                    {FUEL_GROUPS.flatMap((group) => group.types.map((fuelType) => {
                        const current = currentPriceOf(fuelType);
                        const label = FUEL_TYPE_LABELS[fuelType] ?? fuelType;
                        const name = label.startsWith(group.label) ? label : `${group.label} ${label.toLowerCase()}`;

                        return (
                            <div key={fuelType} className="flex flex-col gap-2 bg-surface px-6 py-5">
                                <dt className="text-sm text-ink-muted">{name}</dt>
                                <dd className="flex min-h-10 items-baseline gap-1.5">
                                    {current ? (
                                        <>
                                            <span className="fp-price font-display font-semibold leading-none tracking-tight text-ink tabular-nums">
                                                Q{current.price}
                                            </span>
                                            <span className="text-xs text-ink-muted">/gal</span>
                                        </>
                                    ) : (
                                        <span className="self-center text-sm text-ink-muted">Sin precio vigente</span>
                                    )}
                                </dd>
                            </div>
                        );
                    }))}
                </dl>
            </section>
          </div>
        </div>
    );
}
