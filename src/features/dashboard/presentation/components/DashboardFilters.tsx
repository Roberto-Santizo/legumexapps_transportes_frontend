import { DASHBOARD_PERIODS, type DashboardPeriod } from "@/features/dashboard/dashboard";
import { carrierProvider } from "@/features/carriers/carriers";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react";

type Props = {
    period: DashboardPeriod;
    carrierId?: number;
    onPeriodChange: (period: DashboardPeriod) => void;
    onCarrierChange: (carrierId?: number) => void;
};

/**
 * Los dos recortes globales. El periodo aplica a los resúmenes de viajes y
 * gastos —los viajes en curso y la flota no tienen fecha de negocio—; la
 * empresa aplica a los cuatro bloques.
 *
 * El selector de empresa depende del catálogo de transportistas: si ese
 * listado falla o no está permitido para el rol, se omite en silencio y el
 * tablero sigue mostrando todas las empresas.
 */
export function DashboardFilters({ period, carrierId, onPeriodChange, onCarrierChange }: Props) {
    const { data, isError } = useQuery({
        queryKey: ['getCarriers', 'dashboard'],
        queryFn: () => carrierProvider.getCarriers('100', '0'),
        staleTime: 5 * 60_000,
    });

    const carriers = data?.data ?? [];

    return (
        <div className="flex flex-wrap items-center gap-3">
            <div
                role="radiogroup"
                aria-label="Periodo"
                className="inline-flex rounded-full border border-line bg-surface p-1"
            >
                {DASHBOARD_PERIODS.map((option) => {
                    const active = option.value === period;

                    return (
                        <button
                            key={option.value}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => onPeriodChange(option.value)}
                            className={`cursor-pointer rounded-full px-3.5 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 ${active ? "bg-ink text-surface" : "text-ink-muted hover:text-ink"}`}
                        >
                            {option.label}
                        </button>
                    );
                })}
            </div>

            {!isError && carriers.length > 0 && (
                <label className="inline-flex items-center gap-2 rounded-full border border-line bg-surface py-1 pl-3 pr-2">
                    <Building2 size={14} className="text-ink-subtle" />

                    <span className="sr-only">
                        Empresa
                    </span>

                    <select
                        value={carrierId ?? ''}
                        onChange={(event) => onCarrierChange(event.target.value ? Number(event.target.value) : undefined)}
                        className="cursor-pointer bg-transparent py-1 pr-1 font-mono text-[11px] uppercase tracking-[0.14em] text-ink focus-visible:outline-none"
                    >
                        <option value="">
                            Todas las empresas
                        </option>

                        {carriers.map((carrier) => (
                            <option key={carrier.id} value={carrier.id}>
                                {carrier.name}
                            </option>
                        ))}
                    </select>
                </label>
            )}
        </div>
    );
}
