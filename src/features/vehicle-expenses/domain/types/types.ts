import type { PaginatedVehicleExpensesSchema, VehicleExpenseSchema } from "@/features/vehicle-expenses/vehicle-expenses";
import type { z } from "zod";

export type PaginatedVehicleExpenses = z.infer<typeof PaginatedVehicleExpensesSchema>;
export type VehicleExpense = z.infer<typeof VehicleExpenseSchema>;

/**
 * Lo que se captura. El vehículo no está aquí: en el alta sale del panel donde
 * se registra el gasto y en la edición es **inmutable** —el backend ignora un
 * `vehicle_id` en el PATCH—, así que mover un gasto de unidad es borrarlo y
 * volverlo a crear.
 */
export type VehicleExpenseForm = {
    category: string;
    /** `preventive` o `corrective`. Eje independiente de `category`: no se condicionan. */
    nature: string;
    /** En quetzales. Mínimo 0.01: un cero es captura errónea, no un dato. */
    amount: number;
    /** `Y-m-d`. No admite fechas futuras: el mantenimiento ya ocurrió. */
    expenseDate: string;
    description: string;
}

/** Filtros del listado. Todos opcionales y todos tolerantes en el backend. */
export type VehicleExpenseFilters = {
    category?: string;
    nature?: string;
    /** Cota inferior de `expenseDate`, inclusive, en `Y-m-d`. */
    dateFrom?: string;
    /** Cota superior de `expenseDate`, inclusive, en `Y-m-d`. */
    dateTo?: string;
}
