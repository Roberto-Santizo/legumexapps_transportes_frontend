import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";

const COLORS = ["#22c55e", "#e5e7eb"];

interface DonutSummaryCardProps {
    title: string;
    value: number;
    total: number;
    valueLegend: string;
    totalLegend: string;
    valueIcon: React.ReactNode;
    totalIcon: React.ReactNode;
    centerLabel?: string;
}

export function DonutSummaryCard({ title, value, total, valueLegend, totalLegend, valueIcon, totalIcon, centerLabel = "Completado" }: DonutSummaryCardProps) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0;

    const data = [
        { name: valueLegend, value },
        { name: totalLegend, value: total },
    ];

    return (
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl">
            <div className="mb-5">
                <h3 className="text-lg font-bold text-gray-800">
                    {title}
                </h3>

                <p className="text-sm text-gray-500">
                    {value} de {total} {valueLegend.toLowerCase()}
                </p>
            </div>

            <div className="relative h-64">
                <ResponsiveContainer>
                    <PieChart>
                        <Pie
                            data={data}
                            dataKey="value"
                            innerRadius={70}
                            outerRadius={95}
                            stroke="none"
                            paddingAngle={3}
                        >
                            {COLORS.map((color) => <Cell key={color} fill={color} />)}
                        </Pie>

                        <Tooltip />
                    </PieChart>
                </ResponsiveContainer>

                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-4xl font-bold text-gray-800">
                        {percentage}%
                    </span>

                    <span className="text-sm text-gray-500">
                        {centerLabel}
                    </span>
                </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-4">
                <div className="rounded-2xl bg-green-50 p-4">
                    <div className="flex items-center gap-2 text-green-600">
                        {valueIcon}
                        <span className="text-sm">
                            {valueLegend}
                        </span>
                    </div>

                    <p className="mt-2 text-2xl font-bold text-gray-800">
                        {value}
                    </p>
                </div>

                <div className="rounded-2xl bg-gray-100 p-4">
                    <div className="flex items-center gap-2 text-gray-600">
                        {totalIcon}
                        <span className="text-sm">
                            {totalLegend}
                        </span>
                    </div>

                    <p className="mt-2 text-2xl font-bold text-gray-800">
                        {total}
                    </p>
                </div>
            </div>
        </div>
    );
}
