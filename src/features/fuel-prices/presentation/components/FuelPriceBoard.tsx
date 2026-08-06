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
        <section className="overflow-hidden rounded-2xl bg-ink-deep text-canvas shadow-sm">
            <header className="flex items-center gap-2.5 border-b border-canvas/10 px-6 py-4">
                <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-primary" />

                <h2 className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/60">
                    Precios vigentes
                </h2>
            </header>

            <div className="grid divide-canvas/10 sm:grid-cols-2 sm:divide-x">
                {FUEL_GROUPS.map((group) => (
                    <div key={group.label} className="border-b border-canvas/10 px-6 py-5 last:border-b-0 sm:border-b-0">
                        <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-canvas/40">
                            {group.label}
                        </h3>

                        <dl className="mt-4 flex flex-col gap-4">
                            {group.types.map((fuelType) => {
                                const current = currentPriceOf(fuelType);

                                return (
                                    <div key={fuelType} className="flex flex-col gap-1">
                                        <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-canvas/50">
                                            {FUEL_TYPE_LABELS[fuelType] ?? fuelType}
                                        </dt>

                                        <dd>
                                            {current
                                                ? <FuelPriceFigure price={current.price} size="md" />
                                                : (
                                                    <span className="font-mono text-sm text-canvas/35">
                                                        Sin precio vigente
                                                    </span>
                                                )}
                                        </dd>
                                    </div>
                                );
                            })}
                        </dl>
                    </div>
                ))}
            </div>
        </section>
    );
}
