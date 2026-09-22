import type { DashboardInRouteFilters, DashboardRepository, DashboardSummaryFilters, DashboardVehicleFilters } from "@/features/dashboard/dashboard";
import { DashboardDatasourceImpl, DashboardRepositoryImpl } from "@/features/dashboard/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class DashboardProvider {
    constructor(private repository: DashboardRepository) { }

    getTripsSummary(filters?: DashboardSummaryFilters) {
        return this.repository.getTripsSummary(filters);
    }

    getTripsInRoute(filters?: DashboardInRouteFilters) {
        return this.repository.getTripsInRoute(filters);
    }

    getVehicleExpensesSummary(filters?: DashboardSummaryFilters) {
        return this.repository.getVehicleExpensesSummary(filters);
    }

    getVehicles(filters?: DashboardVehicleFilters) {
        return this.repository.getVehicles(filters);
    }
}

const datasource = new DashboardDatasourceImpl(api);
const repository = new DashboardRepositoryImpl(datasource);
export const dashboardProvider = new DashboardProvider(repository);
