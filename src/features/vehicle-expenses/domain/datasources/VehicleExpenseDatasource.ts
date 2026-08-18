import type {
    PaginatedVehicleExpenses,
    VehicleExpense,
    VehicleExpenseFilters,
    VehicleExpenseForm
} from "@/features/vehicle-expenses/vehicle-expenses";

export abstract class VehicleExpenseDatasource {
    abstract createVehicleExpense(vehicleId: string, payload: VehicleExpenseForm): Promise<string>;
    /** `vehicleId` es obligatorio: sin él la API responde 422, no un listado de la flota. */
    abstract getVehicleExpenses(vehicleId: string, limit: string, page: string, filters?: VehicleExpenseFilters): Promise<PaginatedVehicleExpenses>;
    abstract getVehicleExpenseById(id: string): Promise<VehicleExpense>;
    abstract updateVehicleExpenseById(id: string, payload: VehicleExpenseForm): Promise<string>;
    abstract deleteVehicleExpenseById(id: string): Promise<string>;
}
