import type { DashboardMonthPoint } from "@/features/dashboard/dashboard";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";

type Props = {
    points: DashboardMonthPoint[];
    /** `total` cuenta; `amount` es dinero. */
    dataKey: "total" | "amount";
    color: string;
    formatValue: (value: number) => string;
    formatTick?: (value: number) => string;
    /** Lo que se dice del mes en el tooltip además del valor (p. ej. «15 gastos»). */
    describe?: (point: DashboardMonthPoint) => string | null;
};

/**
 * Eje temporal ya rellenado: los meses sin datos llegan a cero desde
 * `fillMonths`, así que un hueco en el gráfico es un mes sin actividad, no un
 * mes que la API se saltó.
 */
export function MonthlyBars({ points, dataKey, color, formatValue, formatTick, describe }: Props) {
    function ChartTooltip({ active, payload }: TooltipContentProps) {
        if (!active || !payload?.length) return null;

        const point = payload[0].payload as DashboardMonthPoint;
        const detail = describe?.(point);

        return (
            <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
                <p className="text-sm font-semibold text-ink">
                    {formatValue(point[dataKey])}
                </p>

                <p className="mt-0.5 text-xs text-ink-muted">
                    {point.label}
                    {detail && ` · ${detail}`}
                </p>
            </div>
        );
    }

    return (
        <div className="h-64">
            <ResponsiveContainer>
                <BarChart data={points} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="var(--color-line)" />

                    <XAxis
                        dataKey="label"
                        axisLine={{ stroke: "var(--color-line-strong)" }}
                        tickLine={false}
                        tick={{ fill: "var(--color-ink-subtle)", fontSize: 12 }}
                        interval="preserveStartEnd"
                    />

                    <YAxis
                        allowDecimals={false}
                        width={dataKey === "amount" ? 64 : 36}
                        axisLine={false}
                        tickLine={false}
                        tick={{ fill: "var(--color-ink-subtle)", fontSize: 12 }}
                        tickFormatter={formatTick}
                    />

                    <Tooltip cursor={{ fill: "var(--color-canvas)" }} content={ChartTooltip} />

                    <Bar dataKey={dataKey} fill={color} maxBarSize={28} radius={[4, 4, 0, 0]} />
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
