import type { VehicleExpenseFilters, VehicleExpenseForm, VehicleExpenseRepository } from "@/features/vehicle-expenses/vehicle-expenses";
import { VehicleExpenseDatasourceImpl, VehicleExpenseRepositoryImpl } from "@/features/vehicle-expenses/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class VehicleExpenseProvider {
    constructor(private repository: VehicleExpenseRepository) { }

    createVehicleExpense(vehicleId: string, payload: VehicleExpenseForm) {
        return this.repository.createVehicleExpense(vehicleId, payload);
    }

    getVehicleExpenses(vehicleId: string, limit: string, page: string, filters?: VehicleExpenseFilters) {
        return this.repository.getVehicleExpenses(vehicleId, limit, page, filters);
    }

    getVehicleExpenseById(id: string) {
        return this.repository.getVehicleExpenseById(id);
    }

    updateVehicleExpenseById(id: string, payload: VehicleExpenseForm) {
        return this.repository.updateVehicleExpenseById(id, payload);
    }

    deleteVehicleExpenseById(id: string) {
        return this.repository.deleteVehicleExpenseById(id);
    }
}

const datasource = new VehicleExpenseDatasourceImpl(api);
const repository = new VehicleExpenseRepositoryImpl(datasource);
export const vehicleExpenseProvider = new VehicleExpenseProvider(repository);
