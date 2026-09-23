import {
    DASHBOARD_FALLBACK_ROUTE,
    DashboardFilters,
    FleetTable,
    TripsInRouteBoard,
    TripsKpiStrip,
    TripsSummaryPanel,
    VehicleExpensesPanel,
    canFilterDashboardByCarrier,
    canReadDashboard,
    dashboardProvider,
    parseApiDay,
    useDashboardFilters
} from "@/features/dashboard/dashboard";
import { StaggerContainer, StaggerItem, Title } from "@/features/shared/shared";
import type { RootState } from "@/config/config";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const rangeFormatter = new Intl.DateTimeFormat('es-GT', { day: 'numeric', month: 'long' });

/** «Del 1 al 14 de septiembre», o «Todo el histórico» cuando no hay recorte. */
function describeRange(dateFrom?: string, dateTo?: string): string {
    if (!dateFrom || !dateTo) return "Todo el histórico";

    const from = parseApiDay(dateFrom);
    const to = parseApiDay(dateTo);

    if (!from || !to) return `${dateFrom} – ${dateTo}`;

    return `Del ${from.getDate()} al ${rangeFormatter.format(to)}`;
}

/**
 * Cuatro consultas independientes: cada bloque carga y falla por su cuenta.
 * El resumen de viajes y el de gastos se piden aquí porque varios bloques los
 * comparten; los viajes en curso y la flota tienen su propia consulta dentro
 * —una hace polling y la otra se pagina—.
 */
export function Dashboard() {
    const user = useSelector((state: RootState) => state.auth.user);
    const { period, carrierId, range, setPeriod, setCarrierId } = useDashboardFilters();

    /** `pilot`, `user` y `shipment` reciben 403 en los cuatro endpoints; la UX no los deja llegar. */
    const allowed = canReadDashboard(user?.role);
    /** Al `carrier` el backend le ignora `carrierId` (ve su empresa) y `export` no lee `GET /carriers`. */
    const showCarrierFilter = canFilterDashboardByCarrier(user?.role);

    const trips = useQuery({
        queryKey: ['dashboardTrips', range, carrierId],
        queryFn: () => dashboardProvider.getTripsSummary({ ...range, carrierId }),
        enabled: allowed,
    });

    const expenses = useQuery({
        queryKey: ['dashboardVehicleExpenses', range, carrierId],
        queryFn: () => dashboardProvider.getVehicleExpensesSummary({ ...range, carrierId }),
        enabled: allowed,
    });

    if (!allowed) return <Navigate to={DASHBOARD_FALLBACK_ROUTE} replace />;

    return (
        <StaggerContainer>
            <div className="flex min-w-0 flex-col gap-8">
                <StaggerItem>
                    <div className="flex flex-wrap items-end justify-between gap-4">
                        <Title
                            title="Tablero"
                            subtitle={`${describeRange(range.dateFrom, range.dateTo)} · ${user?.role === 'carrier' ? "tu empresa" : carrierId ? "una empresa" : "todas las empresas"}. Los viajes en curso y la flota no dependen del periodo.`}
                        />

                        <DashboardFilters
                            period={period}
                            carrierId={carrierId}
                            onPeriodChange={setPeriod}
                            onCarrierChange={setCarrierId}
                            showCarrierFilter={showCarrierFilter}
                        />
                    </div>
                </StaggerItem>

                <StaggerItem>
                    <TripsKpiStrip
                        summary={trips.data}
                        isLoading={trips.isLoading}
                        error={trips.error}
                        onRetry={() => trips.refetch()}
                    />
                </StaggerItem>

                <StaggerItem>
                    <TripsInRouteBoard carrierId={carrierId} />
                </StaggerItem>

                <StaggerItem>
                    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
                        <TripsSummaryPanel
                            summary={trips.data}
                            range={range}
                            carrierFiltered={Boolean(carrierId)}
                            isLoading={trips.isLoading}
                            error={trips.error}
                            onRetry={() => trips.refetch()}
                        />

                        <VehicleExpensesPanel
                            summary={expenses.data}
                            range={range}
                            isLoading={expenses.isLoading}
                            error={expenses.error}
                            onRetry={() => expenses.refetch()}
                        />
                    </div>
                </StaggerItem>

                <StaggerItem>
                    <FleetTable carrierId={carrierId} />
                </StaggerItem>
            </div>
        </StaggerContainer>
    );
}
