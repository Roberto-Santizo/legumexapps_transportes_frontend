import type {
    CreatedVehicleExpenseSchema,
    PaginatedVehicleExpensesSchema,
    VehicleExpenseSchema
} from "@/features/vehicle-expenses/vehicle-expenses";
import type { z } from "zod";

export type PaginatedVehicleExpenses = z.infer<typeof PaginatedVehicleExpensesSchema>;
export type VehicleExpense = z.infer<typeof VehicleExpenseSchema>;
export type CreatedVehicleExpense = z.infer<typeof CreatedVehicleExpenseSchema>;

/**
 * Lo que se captura en el **alta**. El vehículo no está aquí: sale del panel
 * donde se registra el gasto y después es inmutable —el backend ignora un
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
    /**
     * **Obligatorio y sin valor por omisión**: omitirlo en el alta es 422. Lo
     * decide el usuario, no un valor por defecto silencioso.
     */
    isInvoiced: boolean;
    /**
     * Obligatorio solo con `isInvoiced` en `true`. Con el interruptor apagado
     * el backend lo **descarta en silencio** y responde 201, así que el front
     * lo limpia en vez de mandarlo.
     */
    invoice?: File | null;
}

/**
 * Lo que admite la **edición**. La facturación no está: `is_invoiced` e
 * `invoice` son inmutables y el PATCH los ignora respondiendo 200 sin guardar
 * nada. Corregir un gasto mal facturado es borrarlo y volverlo a crear.
 */
export type VehicleExpenseUpdateForm = Omit<VehicleExpenseForm, 'isInvoiced' | 'invoice'>;

/** Filtros del listado. Todos opcionales y todos tolerantes en el backend. */
export type VehicleExpenseFilters = {
    category?: string;
    nature?: string;
    /** Cota inferior de `expenseDate`, inclusive, en `Y-m-d`. */
    dateFrom?: string;
    /** Cota superior de `expenseDate`, inclusive, en `Y-m-d`. */
    dateTo?: string;
    /** `'true'` solo facturados, `'false'` solo sin factura, vacío ambos. */
    isInvoiced?: string;
}
