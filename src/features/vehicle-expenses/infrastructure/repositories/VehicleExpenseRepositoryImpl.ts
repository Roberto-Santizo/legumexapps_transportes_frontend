import type {
    PaginatedVehicleExpenses,
    VehicleExpense,
    VehicleExpenseDatasource,
    VehicleExpenseFilters,
    VehicleExpenseForm
} from "@/features/vehicle-expenses/vehicle-expenses";
import { VehicleExpenseRepository } from "@/features/vehicle-expenses/vehicle-expenses";

export class VehicleExpenseRepositoryImpl extends VehicleExpenseRepository {
    constructor(private datasource: VehicleExpenseDatasource) {
        super();
    }

    createVehicleExpense(vehicleId: string, payload: VehicleExpenseForm): Promise<string> {
        return this.datasource.createVehicleExpense(vehicleId, payload);
    }

    getVehicleExpenses(vehicleId: string, limit: string, page: string, filters?: VehicleExpenseFilters): Promise<PaginatedVehicleExpenses> {
        return this.datasource.getVehicleExpenses(vehicleId, limit, page, filters);
    }

    getVehicleExpenseById(id: string): Promise<VehicleExpense> {
        return this.datasource.getVehicleExpenseById(id);
    }

    updateVehicleExpenseById(id: string, payload: VehicleExpenseForm): Promise<string> {
        return this.datasource.updateVehicleExpenseById(id, payload);
    }

    deleteVehicleExpenseById(id: string): Promise<string> {
        return this.datasource.deleteVehicleExpenseById(id);
    }
}
