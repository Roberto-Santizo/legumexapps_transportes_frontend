import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CustomFilledButton, type BarChartDatum, type ExportExcelOptions } from "@/features/shared/shared";
import { Download } from "lucide-react";
import type { TooltipContentProps } from "recharts";

const BAR_COLOR = "#2a78d6";

interface BarChartCardProps {
    title: string;
    data: BarChartDatum[];
    excelColumns?: ExportExcelOptions<BarChartDatum>["columns"];
}

function ChartTooltip({ active, payload }: TooltipContentProps) {
    if (!active || !payload?.length) return null;

    const { label, value } = payload[0].payload as BarChartDatum;

    return (
        <div className="rounded-xl border border-line bg-surface px-3 py-2 shadow-sm">
            <p className="text-sm font-semibold text-ink">
                {value}
            </p>

            <p className="text-xs text-ink-muted">
                {label}
            </p>
        </div>
    );
}

export function BarChartCard({ title, data }: BarChartCardProps) {
    return (
        <div className="overflow-hidden rounded-3xl border border-line/70 bg-surface shadow-sm transition-all duration-300 hover:shadow-md">
            <div className="flex items-center justify-between border-b border-line/70 bg-canvas/30 px-6 py-5">
                <div>
                    <h3 className="text-lg font-semibold tracking-tight text-ink">
                        {title}
                    </h3>

                    <div className="mt-2 h-1 w-12 rounded-full bg-primary/80" />
                </div>

                <CustomFilledButton
                    label="Exportar"
                    type="button"
                    icon={<Download className="size-4" />}
                />
            </div>

            <div className="p-6">
                <div className="h-72">
                    <ResponsiveContainer>
                        <BarChart
                            data={data}
                            margin={{ top: 16, right: 8, left: 0, bottom: 0 }}
                        >
                            <CartesianGrid
                                vertical={false}
                                stroke="var(--color-line)"
                            />

                            <XAxis
                                dataKey="label"
                                axisLine={{ stroke: "var(--color-line-strong)" }}
                                tickLine={false}
                                tick={{
                                    fill: "var(--color-ink-subtle)",
                                    fontSize: 12,
                                }}
                            />

                            <YAxis
                                axisLine={false}
                                tickLine={false}
                                tick={{
                                    fill: "var(--color-ink-subtle)",
                                    fontSize: 12,
                                }}
                                allowDecimals={false}
                            />

                            <Tooltip
                                cursor={{ fill: "var(--color-canvas)" }}
                                content={ChartTooltip}
                            />

                            <Bar
                                dataKey="value"
                                fill={BAR_COLOR}
                                radius={[4, 4, 0, 0]}
                                maxBarSize={24}
                            >
                                <LabelList
                                    dataKey="value"
                                    position="top"
                                    fill="var(--color-ink-muted)"
                                    fontSize={12}
                                />
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    );
}