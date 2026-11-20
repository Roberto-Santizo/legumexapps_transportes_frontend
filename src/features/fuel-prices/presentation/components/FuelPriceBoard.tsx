/**
 * La pizarra. Es lo primero que se busca al entrar: cuánto cuesta hoy el galón.
 * Minimalista a propósito: una fila con los cuatro combustibles, nombre claro
 * («Gasolina regular», no «Regular» bajo un rótulo de grupo) y la cifra grande,
 * para que se lea de un vistazo sin decodificar versalitas.
 */

import { FUEL_GROUPS, FUEL_TYPE_LABELS, type FuelPrice } from "@/features/fuel-prices/fuel-prices";

type Props = {
    /** Registros desde los que se resuelve el vigente de cada combustible. */
    prices: FuelPrice[];
}

export function FuelPriceBoard({ prices }: Props) {
    const currentPriceOf = (fuelType: string) =>
        prices.find((price) => price.fuelType === fuelType && price.status === 'active');

    return (
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
                    /** «Regular» solo se entiende bajo su grupo: aquí no hay grupo, así que se nombra completo. */
                    const name = label.startsWith(group.label) ? label : `${group.label} ${label.toLowerCase()}`;

                    return (
                        <div key={fuelType} className="flex flex-col gap-2 bg-surface px-6 py-5">
                            <dt className="text-sm text-ink-muted">{name}</dt>
                            <dd className="flex min-h-10 items-baseline gap-1.5">
                                {current ? (
                                    <>
                                        <span className="font-display text-3xl font-semibold leading-none tracking-tight text-ink tabular-nums">
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
    );
}
