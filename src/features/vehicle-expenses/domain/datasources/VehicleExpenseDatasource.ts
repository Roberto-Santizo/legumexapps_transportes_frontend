import type {
    CreatedVehicleExpense,
    PaginatedVehicleExpenses,
    VehicleExpense,
    VehicleExpenseFilters,
    VehicleExpenseForm,
    VehicleExpenseUpdateForm
} from "@/features/vehicle-expenses/vehicle-expenses";

export abstract class VehicleExpenseDatasource {
    /** Devuelve el gasto creado: es la única forma de confirmar si la factura quedó. */
    abstract createVehicleExpense(vehicleId: string, payload: VehicleExpenseForm): Promise<CreatedVehicleExpense>;
    /** `vehicleId` es obligatorio: sin él la API responde 422, no un listado de la flota. */
    abstract getVehicleExpenses(vehicleId: string, limit: string, page: string, filters?: VehicleExpenseFilters): Promise<PaginatedVehicleExpenses>;
    abstract getVehicleExpenseById(id: string): Promise<VehicleExpense>;
    /** Sin facturación: `is_invoiced` e `invoice` son inmutables tras el alta. */
    abstract updateVehicleExpenseById(id: string, payload: VehicleExpenseUpdateForm): Promise<string>;
    abstract deleteVehicleExpenseById(id: string): Promise<string>;
}
