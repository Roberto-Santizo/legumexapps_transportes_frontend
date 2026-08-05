import { COMPLIANCE_LATE_LIMIT, COMPLIANCE_WEEKS, PanelShell, type ComplianceWeek } from "@/features/dashboard/dashboard";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { TooltipContentProps } from "recharts";
import { TriangleAlert } from "lucide-react";

const WITHIN_LIMIT = "#56685e";
const OVER_LIMIT = "#e8a33d";

const data = COMPLIANCE_WEEKS.map((week) => ({
    ...week,
    overLimit: week.late > COMPLIANCE_LATE_LIMIT,
    tip: week.late > COMPLIANCE_LATE_LIMIT ? String(week.late) : "",
}));

const weeksOverLimit = data.filter((week) => week.overLimit).length;

function ChartTooltip({ active, payload }: TooltipContentProps) {
    if (!active || !payload?.length) return null;

    const { week, late, trips, onTimeRate } = payload[0].payload as ComplianceWeek;

    return (
        <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
            <p className="text-sm font-semibold text-ink">
                {late} demorados de {trips}
            </p>

            <p className="mt-0.5 text-xs text-ink-muted">
                Semana {week.replace("S", "")} · {onTimeRate} % a tiempo
            </p>
        </div>
    );
}

export function ComplianceChart() {
    return (
        <PanelShell
            eyebrow="Cumplimiento"
            title="Viajes demorados por semana"
            description={`La operación tolera hasta ${COMPLIANCE_LATE_LIMIT} demoras por semana antes de escalar con el transportista.`}
            aside={
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/40 bg-primary/10 px-3 py-1.5 text-ink">
                    <TriangleAlert size={14} />

                    <span className="font-mono text-[11px] uppercase tracking-[0.14em]">
                        {weeksOverLimit} semanas sobre el límite
                    </span>
                </span>
            }
        >
            <div className="px-4 pb-6 pt-6 sm:px-6">
                <div className="h-72">
                    <ResponsiveContainer>
                        <BarChart
                            data={data}
                            margin={{ top: 24, right: 16, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid vertical={false} stroke="var(--color-line)" />

                            <XAxis
                                dataKey="week"
                                axisLine={{ stroke: "var(--color-line-strong)" }}
                                tickLine={false}
                                tick={{ fill: "var(--color-ink-subtle)", fontSize: 12 }}
                            />

                            <YAxis
                                allowDecimals={false}
                                domain={[0, 8]}
                                width={40}
                                axisLine={false}
                                tickLine={false}
                                tick={{ fill: "var(--color-ink-subtle)", fontSize: 12 }}
                            />

                            <Tooltip
                                cursor={{ fill: "var(--color-canvas)" }}
                                content={ChartTooltip}
                            />

                            <ReferenceLine
                                y={COMPLIANCE_LATE_LIMIT}
                                stroke="var(--color-line-strong)"
                                strokeWidth={1}
                                label={{
                                    value: `Límite ${COMPLIANCE_LATE_LIMIT}`,
                                    position: "insideTopRight",
                                    fill: "var(--color-ink-muted)",
                                    fontSize: 11,
                                }}
                            />

                            <Bar dataKey="late" maxBarSize={24} radius={[4, 4, 0, 0]}>
                                {data.map((week) => (
                                    <Cell
                                        key={week.week}
                                        fill={week.overLimit ? OVER_LIMIT : WITHIN_LIMIT}
                                    />
                                ))}

                                <LabelList
                                    dataKey="tip"
                                    position="top"
                                    fill="var(--color-ink)"
                                    fontSize={12}
                                    fontWeight={600}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>

                <ul className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
                    <li className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: WITHIN_LIMIT }} />

                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                            Dentro del límite
                        </span>
                    </li>

                    <li className="flex items-center gap-2">
                        <span className="size-2 rounded-full" style={{ backgroundColor: OVER_LIMIT }} />

                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                            Sobre el límite
                        </span>
                    </li>
                </ul>
            </div>
        </PanelShell>
    );
}
