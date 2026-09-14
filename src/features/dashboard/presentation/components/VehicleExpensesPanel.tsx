import {
    MonthlyBars,
    PanelError,
    PanelShell,
    PanelSkeleton,
    RankedList,
    fillMonths,
    formatCompactMoney,
    formatInteger,
    formatMoney,
    percentOf,
    toAmount,
    type DashboardDateRange,
    type VehicleExpensesSummary
} from "@/features/dashboard/dashboard";
import { VEHICLE_EXPENSE_CATEGORY_LABELS } from "@/features/vehicle-expenses/vehicle-expenses";

type Props = {
    summary?: VehicleExpensesSummary;
    range: DashboardDateRange;
    isLoading: boolean;
    error?: Error | null;
    onRetry: () => void;
};

const EXPENSES_COLOR = "#e8a33d";

type SplitProps = {
    heading: string;
    left: { label: string; count: number; totalAmount: string; className: string };
    right: { label: string; count: number; totalAmount: string; className: string };
};

/**
 * Dos mitades que suman el total: preventivo/correctivo y facturado/sin
 * facturar. La barra reparte por **importe**, no por conteo, porque es el
 * dinero lo que se decide con este bloque.
 */
function SplitBar({ heading, left, right }: SplitProps) {
    const leftAmount = toAmount(left.totalAmount);
    const rightAmount = toAmount(right.totalAmount);
    const leftShare = percentOf(leftAmount, leftAmount + rightAmount);

    return (
        <div className="flex flex-col gap-3">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                {heading}
            </p>

            <div className="flex h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className={`h-full ${left.className}`} style={{ width: `${leftShare}%` }} />
                <div className={`h-full flex-1 ${right.className}`} />
            </div>

            <dl className="grid grid-cols-2 gap-4">
                {[left, right].map((side) => (
                    <div key={side.label}>
                        <dt className="flex items-center gap-2 text-xs text-ink-muted">
                            <span className={`size-2 rounded-full ${side.className}`} />
                            {side.label}
                        </dt>

                        <dd className="mt-1 font-mono text-[13px] text-ink">
                            {formatMoney(side.totalAmount)}
                            <span className="ml-1.5 text-ink-subtle">
                                · {formatInteger(side.count)}
                            </span>
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    );
}

/**
 * `/dashboard/vehicle-expenses`: todo el dinero llega como cadena y aquí solo
 * se convierte para repartir barras y graficar. Se cumple que facturado + sin
 * facturar es el total, y que preventivo + correctivo también.
 */
export function VehicleExpensesPanel({ summary, range, isLoading, error, onRetry }: Props) {
    const points = summary ? fillMonths(summary.byMonth, range) : [];
    const totalAmount = summary ? toAmount(summary.totalAmount) : 0;

    return (
        <PanelShell
            eyebrow="Mantenimiento"
            title="Gasto de flota"
            description="Lo que costó mantener las unidades en el periodo, por fecha del gasto."
            aside={summary && (
                <div className="text-right">
                    <p className="font-display text-[28px] font-semibold leading-none tracking-tight text-ink">
                        {formatMoney(summary.totalAmount)}
                    </p>

                    <p className="mt-1.5 text-xs text-ink-muted">
                        {formatInteger(summary.count)} {summary.count === 1 ? "gasto registrado" : "gastos registrados"}
                    </p>
                </div>
            )}
        >
            <div className="px-6 pb-6 pt-5">
                {isLoading && !summary && <PanelSkeleton rows={6} />}

                {error && <PanelError message={error.message} onRetry={onRetry} />}

                {summary && (
                    <div className="flex flex-col gap-8">
                        <div className="grid gap-8 md:grid-cols-2">
                            <SplitBar
                                heading="Naturaleza"
                                left={{ label: "Preventivo", ...summary.byNature.preventive, className: "bg-success" }}
                                right={{ label: "Correctivo", ...summary.byNature.corrective, className: "bg-danger/70" }}
                            />

                            <SplitBar
                                heading="Facturación"
                                left={{ label: "Facturado", ...summary.invoiced, className: "bg-ink" }}
                                right={{ label: "Sin facturar", ...summary.notInvoiced, className: "bg-line-strong" }}
                            />
                        </div>

                        <MonthlyBars
                            points={points}
                            dataKey="amount"
                            color={EXPENSES_COLOR}
                            formatValue={formatMoney}
                            formatTick={formatCompactMoney}
                            describe={(point) => point.total > 0 ? `${formatInteger(point.total)} ${point.total === 1 ? "gasto" : "gastos"}` : null}
                        />

                        <div className="grid gap-8 md:grid-cols-2">
                            <RankedList
                                heading="Por categoría"
                                total={totalAmount}
                                limit={6}
                                emptyText="Sin gastos en el periodo"
                                rows={summary.byCategory.map((row) => ({
                                    id: row.category,
                                    label: VEHICLE_EXPENSE_CATEGORY_LABELS[row.category] ?? row.category,
                                    value: toAmount(row.totalAmount),
                                    display: formatMoney(row.totalAmount),
                                }))}
                            />

                            <RankedList
                                heading="Por empresa transportista"
                                total={totalAmount}
                                limit={6}
                                emptyText="Sin gastos en el periodo"
                                rows={summary.byCarrier.map((row) => ({
                                    id: row.carrierId,
                                    label: row.carrierName,
                                    value: toAmount(row.totalAmount),
                                    display: formatMoney(row.totalAmount),
                                }))}
                            />
                        </div>
                    </div>
                )}
            </div>
        </PanelShell>
    );
}
