import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Nueve claves, todas en camelCase. Ni `updatedAt` ni kilometraje ni adjuntos:
 * el taller, la factura y la pieza caben hoy dentro de `description`.
 *
 * `amount` llega como cadena con dos decimales por el casting del backend, y
 * las dos fechas llegan **ya formateadas** (`d-m-Y` y `d-m-Y h:i:s A`): no son
 * ISO 8601 y `new Date(...)` sobre ellas devuelve `Invalid Date`.
 */
export const VehicleExpenseSchema = z.object({
    id: z.number(),
    vehicleId: z.number(),
    category: z.string(),
    nature: z.string(),
    amount: z.string(),
    expenseDate: z.string(),
    description: z.string(),
    /** Nombre de quien capturó el gasto. El id del usuario no sale nunca por la API. */
    registeredBy: z.string(),
    createdAt: z.string()
});

/**
 * `totalAmount` y `total` viajan juntos en la raíz del sobre y no son lo mismo:
 * `totalAmount` es la **suma en quetzales** de todos los gastos filtrados —no
 * los de la página— y aparece siempre; `total` es el **conteo** de registros y
 * solo aparece cuando se pagina.
 */
export const PaginatedVehicleExpensesSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(VehicleExpenseSchema),
    totalAmount: z.string(),
    lastPage: z.number().optional()
});
