interface InfoCardProps {
    icon: React.ReactNode;
    label: string;
    value: string | number;
}

export function InfoCard({ icon, label, value }: InfoCardProps) {
    return (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-500 mb-2">
                {icon}
                <span className="text-sm font-medium">{label}</span>
            </div>

            <p className="text-lg font-semibold text-slate-800">
                {value}
            </p>
        </div>
    );
}
