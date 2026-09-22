import { DEFAULT_DASHBOARD_PERIOD, isDashboardPeriod, resolveDashboardRange, toCarrierId, type DashboardDateRange, type DashboardPeriod } from "@/features/dashboard/dashboard";
import { useSearchParams } from "react-router-dom";

/**
 * Los dos filtros globales del tablero viven en la URL (`periodo`, `empresa`)
 * para que un refresco o un enlace compartido conserven el recorte. Un valor
 * inválido cae al valor por defecto aquí mismo: la API lo ignoraría en
 * silencio y devolvería todo el histórico sin avisar.
 *
 * Cambiar el periodo o la empresa reinicia la página de la flota: el `total`
 * paginado se recorta con `carrierId` y una página vieja podría quedar vacía.
 */
export function useDashboardFilters() {
    const [searchParams, setSearchParams] = useSearchParams();

    const rawPeriod = searchParams.get('periodo');
    const period: DashboardPeriod = isDashboardPeriod(rawPeriod) ? rawPeriod : DEFAULT_DASHBOARD_PERIOD;
    const carrierId = toCarrierId(searchParams.get('empresa'));
    const range: DashboardDateRange = resolveDashboardRange(period);

    const setPeriod = (next: DashboardPeriod) => {
        setSearchParams((params) => {
            if (next === DEFAULT_DASHBOARD_PERIOD) params.delete('periodo');
            else params.set('periodo', next);

            params.delete('page');

            return params;
        });
    };

    const setCarrierId = (next?: number) => {
        setSearchParams((params) => {
            if (next) params.set('empresa', String(next));
            else params.delete('empresa');

            params.delete('page');

            return params;
        });
    };

    return { period, carrierId, range, setPeriod, setCarrierId };
}
