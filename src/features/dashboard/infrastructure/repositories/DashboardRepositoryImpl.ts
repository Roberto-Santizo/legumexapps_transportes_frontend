import type { DashboardDatasource, DashboardInRouteFilters, DashboardSummaryFilters, DashboardVehicleFilters, DashboardVehicles, TripInRoute, TripsSummary, VehicleExpensesSummary } from "@/features/dashboard/dashboard";
import { DashboardRepository } from "@/features/dashboard/dashboard";

export class DashboardRepositoryImpl extends DashboardRepository {
    constructor(private datasource: DashboardDatasource) {
        super();
    }

    getTripsSummary(filters?: DashboardSummaryFilters): Promise<TripsSummary> {
        return this.datasource.getTripsSummary(filters);
    }

    getTripsInRoute(filters?: DashboardInRouteFilters): Promise<TripInRoute[]> {
        return this.datasource.getTripsInRoute(filters);
    }

    getVehicleExpensesSummary(filters?: DashboardSummaryFilters): Promise<VehicleExpensesSummary> {
        return this.datasource.getVehicleExpensesSummary(filters);
    }

    getVehicles(filters?: DashboardVehicleFilters): Promise<DashboardVehicles> {
        return this.datasource.getVehicles(filters);
    }
}
