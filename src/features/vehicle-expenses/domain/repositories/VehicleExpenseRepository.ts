import type {
    PaginatedVehicleExpenses,
    VehicleExpense,
    VehicleExpenseFilters,
    VehicleExpenseForm
} from "@/features/vehicle-expenses/vehicle-expenses";

export abstract class VehicleExpenseRepository {
    abstract createVehicleExpense(vehicleId: string, payload: VehicleExpenseForm): Promise<string>;
    abstract getVehicleExpenses(vehicleId: string, limit: string, page: string, filters?: VehicleExpenseFilters): Promise<PaginatedVehicleExpenses>;
    abstract getVehicleExpenseById(id: string): Promise<VehicleExpense>;
    abstract updateVehicleExpenseById(id: string, payload: VehicleExpenseForm): Promise<string>;
    abstract deleteVehicleExpenseById(id: string): Promise<string>;
}
