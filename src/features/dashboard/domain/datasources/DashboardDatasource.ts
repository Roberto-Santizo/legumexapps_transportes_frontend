import type { DashboardInRouteFilters, DashboardSummaryFilters, DashboardVehicleFilters, DashboardVehicles, TripInRoute, TripsSummary, VehicleExpensesSummary } from "@/features/dashboard/dashboard";

export abstract class DashboardDatasource {
    abstract getTripsSummary(filters?: DashboardSummaryFilters): Promise<TripsSummary>;
    abstract getTripsInRoute(filters?: DashboardInRouteFilters): Promise<TripInRoute[]>;
    abstract getVehicleExpensesSummary(filters?: DashboardSummaryFilters): Promise<VehicleExpensesSummary>;
    abstract getVehicles(filters?: DashboardVehicleFilters): Promise<DashboardVehicles>;
}
