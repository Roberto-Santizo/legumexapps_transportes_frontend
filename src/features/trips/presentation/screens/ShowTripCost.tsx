/**
 * Cuánto le costó **directamente** el viaje a quien lo corrió.
 *
 * La cifra es costo directo y se rotula así a propósito: son cuatro
 * componentes —combustible, viáticos, salario y seguro prorrateados— y ninguno
 * más. Llamarla «costo total» sería prometer depreciación, mantenimiento y
 * peajes que la API no calcula.
 *
 * Tres decisiones de la pantalla:
 *
 * - **Solo hay costo en un viaje `finished`**, y al listado solo se le ofrece
 *   la opción en ese estado. Quien llega a la URL a mano con otro estado se
 *   topa con el 400 del servidor, que se pinta tal cual.
 * - **El piloto no entra**, ni siquiera al suyo: el desglose revela su salario.
 * - **El total no se recalcula.** `totalCost` ya cuadra con los cuatro
 *   subtotales tal como salen; la barra solo reparte ese mismo total.
 */

import {
    TRIP_COST_COMPONENT_LABELS,
    TRIP_COST_MONTH_HOURS,
    TRIP_FUEL_TYPE_LABELS,
    TripOrder,
    TripPageHeader,
    canReadTripCost,
    formatAmount,
    formatGallons,
    formatTripHours,
    parseAmount,
    tripCostMissingInputs,
    tripCostShares,
    tripProvider,
    type TripCostComponent
} from "@/features/trips/trips";
import { ErrorComponent, FadeInUp } from "@/features/shared/shared";
import { Eye } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import type { ReactNode } from "react";
import type { RootState } from "@/config/store/store";

/** El color de cada componente, el mismo en la barra y en su bloque. */
const SWATCHES: Record<TripCostComponent, string> = {
    fuel: "bg-primary",
    expenses: "bg-canvas",
    pilot: "bg-success",
    vehicle: "bg-ink-subtle",
};

/** Una cifra que falta se dice con palabras, no con un cero. */
const MISSING = "Sin dato";

type BlockProps = {
    component: TripCostComponent;
    subtotal: string;
    /** El porcentaje del costo directo que se lleva este componente. */
    share: number;
    children: ReactNode;
}

/** Cada componente como un renglón de libro: nombre y subtotal arriba, de dónde sale abajo. */
function CostBlock({ component, subtotal, share, children }: BlockProps) {
    return (
        <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface px-6 py-6">
            <header className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-2.5">
                    <span aria-hidden className={`size-2.5 shrink-0 rounded-sm ring-1 ring-ink/10 ${SWATCHES[component]}`} />

                    <h2 className="font-display text-base font-semibold tracking-tight text-ink">
                        {TRIP_COST_COMPONENT_LABELS[component]}
                    </h2>
                </div>

                <div className="flex flex-col items-end gap-1">
                    <span className="font-mono text-lg tabular-nums text-ink">{formatAmount(subtotal)}</span>

                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        {share.toLocaleString('es-GT', { maximumFractionDigits: 1 })} % del costo
                    </span>
                </div>
            </header>

            {children}
        </section>
    );
}

type RowProps = {
    label: string;
    value: string;
    missing?: boolean;
}

function Row({ label, value, missing = false }: RowProps) {
    return (
        <div className="flex items-baseline justify-between gap-4 border-t border-line pt-2.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">{label}</dt>

            <dd className={`text-right font-mono text-[13px] tabular-nums ${missing ? 'text-danger' : 'text-ink'}`}>
                {value}
            </dd>
        </div>
    );
}

/**
 * La cuenta del prorrateo escrita entera. Sin ella, los Q15 de un viaje de dos
 * horas sobre un salario de Q4 500 parecen un error.
 */
function Formula({ monthly, hours }: { monthly: string | null; hours: string | null }) {
    return (
        <p className="rounded-lg bg-canvas px-3 py-2.5 font-mono text-[11px] tabular-nums text-ink-muted">
            {monthly === null ? MISSING : formatAmount(monthly)}
            {" ÷ "}{TRIP_COST_MONTH_HOURS} h{" × "}
            {hours === null ? MISSING : `${hours} h`}
        </p>
    );
}

export function ShowTripCost() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canRead = canReadTripCost(role);

    const { data: cost, isLoading, isError, error } = useQuery({
        queryKey: ['getTripCost', id],
        queryFn: () => tripProvider.getTripCost(id!),
        enabled: Boolean(id) && canRead,
        /** Un 400 o un 403 no cambian por insistir. */
        retry: false
    });

    if (!canRead) {
        return (
            <ErrorComponent
                message="El costo de un viaje no está disponible para el piloto: el desglose incluye su salario."
            />
        );
    }

    if (isError) return <ErrorComponent message={error.message} />

    const total = cost ? parseAmount(cost.totalCost) : 0;
    const shares = cost ? tripCostShares(cost) : [];
    const shareOf = (component: TripCostComponent) => {
        const amount = shares.find((entry) => entry.component === component)?.amount ?? 0;

        return total > 0 ? amount / total * 100 : 0;
    };
    const holes = cost ? tripCostMissingInputs(cost) : [];

    return (
        <div className="flex flex-col gap-8">
            <TripPageHeader
                title="Costo directo"
                subtitle="Lo que el viaje consumió en combustible y viáticos, más la parte del salario y del seguro que le corresponde por sus horas."
            >
                <button
                    type="button"
                    onClick={() => navigate(`/viajes/${id}`)}
                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    <Eye size={16} />
                    Ver detalle
                </button>
            </TripPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Calculando costo
                </p>
            )}

            {!isLoading && cost && (
                <FadeInUp>
                    <div className="flex flex-col gap-6">
                        {/* La chapa del viaje, con el total y cómo se reparte. */}
                        <div className="flex flex-col gap-6 rounded-2xl bg-ink-deep px-7 py-8 text-canvas">
                            <div className="flex flex-wrap items-start justify-between gap-4">
                                <div className="flex flex-col gap-2">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                        Viaje {cost.tripId}
                                    </span>

                                    <TripOrder order={cost.order} size="lg" />
                                </div>

                                <div className="flex flex-col items-end gap-1">
                                    <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                        Horas de viaje
                                    </span>

                                    <span className="font-mono text-sm tabular-nums">
                                        {formatTripHours(cost.traveledHours) ?? MISSING}
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col gap-1">
                                <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-primary">
                                    Costo directo
                                </span>

                                <span className="font-display text-4xl font-semibold tracking-tight tabular-nums sm:text-5xl">
                                    {formatAmount(cost.totalCost)}
                                </span>
                            </div>

                            {/* Los cuatro subtotales como tramos de una sola barra: ancho = parte del total. */}
                            <div className="flex flex-col gap-3">
                                <div
                                    role="img"
                                    aria-label={shares.map((entry) => `${TRIP_COST_COMPONENT_LABELS[entry.component]}: ${formatAmount(entry.amount)}`).join(', ')}
                                    className="flex h-2.5 w-full gap-0.5 overflow-hidden rounded-full bg-canvas/10"
                                >
                                    {total > 0 && shares.filter((entry) => entry.amount > 0).map((entry) => (
                                        <span
                                            key={entry.component}
                                            className={`h-full ${SWATCHES[entry.component]}`}
                                            style={{ width: `${entry.amount / total * 100}%` }}
                                        />
                                    ))}
                                </div>

                                <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                                    {shares.map((entry) => (
                                        <li key={entry.component} className="inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-canvas/70">
                                            <span aria-hidden className={`size-1.5 rounded-sm ${SWATCHES[entry.component]}`} />
                                            {TRIP_COST_COMPONENT_LABELS[entry.component]}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>

                        {/* Un total bajo casi siempre es un insumo que falta: se dice antes que el desglose. */}
                        {holes.length > 0 && (
                            <div className="flex flex-col gap-2 rounded-xl border border-dashed border-danger/40 bg-surface px-5 py-4">
                                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-danger">
                                    Faltan datos para el cálculo
                                </p>

                                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-ink-muted">
                                    {holes.map((hole) => <li key={hole}>{hole}</li>)}
                                </ul>
                            </div>
                        )}

                        <div className="grid gap-4 lg:grid-cols-2">
                            <CostBlock component="fuel" subtotal={cost.fuel.subtotal} share={shareOf('fuel')}>
                                {cost.fuel.byType.length === 0 ? (
                                    <p className="text-sm text-ink-muted">El viaje no tiene cargas de combustible confirmadas.</p>
                                ) : (
                                    <dl className="flex flex-col gap-2.5">
                                        {cost.fuel.byType.map((type) => (
                                            <div key={type.fuelType} className="flex flex-col gap-1 border-t border-line pt-2.5">
                                                <div className="flex items-baseline justify-between gap-4">
                                                    <dt className="text-sm text-ink">
                                                        {TRIP_FUEL_TYPE_LABELS[type.fuelType] ?? type.fuelType}
                                                    </dt>

                                                    <dd className="font-mono text-[13px] tabular-nums text-ink">
                                                        {formatAmount(type.amount)}
                                                    </dd>
                                                </div>

                                                <p className="font-mono text-[11px] tabular-nums text-ink-muted">
                                                    {formatGallons(type.gallons)} gal × {type.pricePerGallon === null
                                                        ? <span className="text-danger">sin precio</span>
                                                        : `${formatAmount(type.pricePerGallon)}/gal`}
                                                </p>
                                            </div>
                                        ))}

                                        <Row label="Galones confirmados" value={`${formatGallons(cost.fuel.gallons)} gal`} />
                                    </dl>
                                )}

                                {cost.fuel.byType.length > 1 && (
                                    <p className="text-xs text-ink-subtle">
                                        Cada carga se cotiza al precio vigente en su fecha. Si un tipo cruzó un cambio de precio, su precio por galón es el promedio ponderado.
                                    </p>
                                )}
                            </CostBlock>

                            <CostBlock component="expenses" subtotal={cost.expenses.subtotal} share={shareOf('expenses')}>
                                <dl className="flex flex-col gap-2.5">
                                    <Row label="Viáticos confirmados" value={cost.expenses.count.toString()} />
                                </dl>

                                <p className="text-xs text-ink-subtle">
                                    Solo suman los viáticos que el piloto confirmó haber recibido.
                                </p>
                            </CostBlock>

                            <CostBlock component="pilot" subtotal={cost.pilot.subtotal} share={shareOf('pilot')}>
                                <dl className="flex flex-col gap-2.5">
                                    <Row label="Piloto" value={cost.pilot.pilotName ?? "Sin asignar"} missing={cost.pilot.pilotName === null} />
                                    <Row
                                        label="Salario mensual"
                                        value={cost.pilot.monthlySalary === null ? MISSING : formatAmount(cost.pilot.monthlySalary)}
                                        missing={cost.pilot.monthlySalary === null}
                                    />
                                </dl>

                                <Formula monthly={cost.pilot.monthlySalary} hours={cost.traveledHours} />
                            </CostBlock>

                            <CostBlock component="vehicle" subtotal={cost.vehicle.subtotal} share={shareOf('vehicle')}>
                                <dl className="flex flex-col gap-2.5">
                                    <Row label="Placa" value={cost.vehicle.plate ?? "Sin asignar"} missing={cost.vehicle.plate === null} />
                                    <Row
                                        label="Seguro mensual"
                                        value={cost.vehicle.monthlyInsuranceCost === null ? MISSING : formatAmount(cost.vehicle.monthlyInsuranceCost)}
                                        missing={cost.vehicle.monthlyInsuranceCost === null}
                                    />
                                </dl>

                                <Formula monthly={cost.vehicle.monthlyInsuranceCost} hours={cost.traveledHours} />

                                <p className="text-xs text-ink-subtle">
                                    Se usa el seguro que el vehículo tiene hoy: si se edita, este subtotal cambia.
                                </p>
                            </CostBlock>
                        </div>

                        <p className="max-w-3xl text-sm text-ink-muted">
                            El salario y el seguro se reparten sobre un mes de {TRIP_COST_MONTH_HOURS} horas (30 días × 24 h), así que en un viaje corto su parte es pequeña.
                            Este costo no incluye depreciación ni mantenimiento del vehículo, llantas, peajes ni gastos de administración.
                        </p>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
