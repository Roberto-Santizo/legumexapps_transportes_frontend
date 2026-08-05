import { COLD_CHAIN_RANGE, COLD_CHAIN_READINGS, PanelShell, type ColdChainReading } from "@/features/dashboard/dashboard";
import { Area, AreaChart, CartesianGrid, ReferenceArea, ReferenceDot, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { TriangleAlert } from "lucide-react";

const SAFE = "#25845a";
const ALERT = "#c0483c";

const excursions = COLD_CHAIN_READINGS.filter(
    (reading) => reading.celsius > COLD_CHAIN_RANGE.max || reading.celsius < COLD_CHAIN_RANGE.min
);

const peak = excursions.reduce<ColdChainReading | null>(
    (worst, reading) => (!worst || reading.celsius > worst.celsius ? reading : worst),
    null
);

function ChartTooltip({ active, payload }: TooltipContentProps) {
    if (!active || !payload?.length) return null;

    const { time, celsius } = payload[0].payload as ColdChainReading;
    const outOfRange = celsius > COLD_CHAIN_RANGE.max || celsius < COLD_CHAIN_RANGE.min;

    return (
        <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
            <p className="font-mono text-[13px] font-medium text-ink">
                {celsius.toFixed(1)} °C
            </p>

            <p className="mt-0.5 text-xs text-ink-muted">
                {time} h · {outOfRange ? "fuera de rango" : "dentro de rango"}
            </p>
        </div>
    );
}

export function ColdChainChart() {
    return (
        <PanelShell
            eyebrow="Cadena de frío · P-733KLM"
            title="Termógrafo de las últimas 24 horas"
            description={`La carga viaja entre ${COLD_CHAIN_RANGE.min} y ${COLD_CHAIN_RANGE.max} °C. Fuera de esa banda el lote pierde vida de anaquel.`}
            aside={
                <span className="inline-flex items-center gap-2 rounded-full border border-danger/30 bg-danger/5 px-3 py-1.5 text-danger">
                    <TriangleAlert size={14} />

                    <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                        {excursions.length} lecturas fuera de rango
                    </span>
                </span>
            }
        >
            <div className="px-4 pb-6 pt-6 sm:px-6">
                <div className="h-72">
                    <ResponsiveContainer>
                        <AreaChart
                            data={COLD_CHAIN_READINGS}
                            margin={{ top: 28, right: 16, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid vertical={false} stroke="var(--color-line)" />

                            <XAxis
                                dataKey="time"
                                interval={1}
                                axisLine={{ stroke: "var(--color-line-strong)" }}
                                tickLine={false}
                                tick={{ fill: "var(--color-ink-subtle)", fontSize: 12 }}
                            />

                            <YAxis
                                domain={[0, 12]}
                                ticks={[0, 2, 4, 6, 8, 10, 12]}
                                tickFormatter={(value: number) => `${value}°`}
                                width={40}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "var(--color-ink-subtle)", fontSize: 12 }}
                            />

                            <ReferenceArea
                                y1={COLD_CHAIN_RANGE.min}
                                y2={COLD_CHAIN_RANGE.max}
                                fill={SAFE}
                                fillOpacity={0.07}
                            />

                            <ReferenceLine
                                y={COLD_CHAIN_RANGE.max}
                                stroke={ALERT}
                                strokeWidth={1}
                                label={{
                                    value: `Máximo ${COLD_CHAIN_RANGE.max} °C`,
                                    position: "insideTopRight",
                                    fill: "var(--color-ink-muted)",
                                    fontSize: 11,
                                }}
                            />

                            <Tooltip
                                cursor={{ stroke: "var(--color-line-strong)" }}
                                content={ChartTooltip}
                            />

                            <Area
                                type="monotone"
                                dataKey="celsius"
                                stroke={SAFE}
                                strokeWidth={2}
                                fill={SAFE}
                                fillOpacity={0.1}
                                dot={false}
                                activeDot={{
                                    r: 4,
                                    fill: SAFE,
                                    stroke: "var(--color-surface)",
                                    strokeWidth: 2,
                                }}
                            />

                            {excursions.map((reading) => (
                                <ReferenceDot
                                    key={reading.time}
                                    x={reading.time}
                                    y={reading.celsius}
                                    r={5}
                                    fill={ALERT}
                                    stroke="var(--color-surface)"
                                    strokeWidth={2}
                                    label={
                                        reading.time === peak?.time
                                            ? {
                                                value: `${reading.celsius.toFixed(1)} °C`,
                                                position: "top",
                                                fill: "var(--color-ink)",
                                                fontSize: 12,
                                                fontWeight: 600,
                                            }
                                            : undefined
                                    }
                                />
                            ))}
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                <p className="mt-4 text-sm text-ink-muted">
                    El pico coincide con la espera en la báscula de planta. Revisa el termógrafo antes de liberar el lote.
                </p>
            </div>
        </PanelShell>
    );
}
