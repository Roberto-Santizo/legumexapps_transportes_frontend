import { OPERATION_STATS } from "@/features/dashboard/dashboard";

export function OperationStrip() {
    return (
        <dl className="grid grid-cols-1 gap-px overflow-hidden rounded-2xl border border-line bg-line sm:grid-cols-2 xl:grid-cols-4">
            {OPERATION_STATS.map((stat) => (
                <div key={stat.label} className="bg-surface px-6 py-5">
                    <dt className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                        {stat.label}
                    </dt>

                    <dd className="mt-3 font-display text-[34px] font-semibold leading-none tracking-tight text-ink">
                        {stat.value}
                        {stat.unit && (
                            <span className="ml-1 align-baseline text-lg font-medium text-ink-muted">
                                {stat.unit}
                            </span>
                        )}
                    </dd>

                    <p className="mt-2 text-xs text-ink-muted">
                        {stat.detail}
                    </p>
                </div>
            ))}
        </dl>
    );
}
