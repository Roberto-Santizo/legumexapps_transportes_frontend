import { ApiPaginatedResponseSchema, ApiResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Doce claves, todas en camelCase. Ni `updatedAt` ni kilometraje ni proveedor:
 * el taller, el número de factura y la pieza caben hoy dentro de `description`.
 *
 * `amount` llega como cadena con dos decimales por el casting del backend, y
 * las dos fechas llegan **ya formateadas** (`d-m-Y` y `d-m-Y h:i:s A`): no son
 * ISO 8601 y `new Date(...)` sobre ellas devuelve `Invalid Date`.
 *
 * Las tres claves de facturación son un bloque: `isInvoiced` en `false` obliga
 * a que `invoiceUrl` e `invoiceType` sean `null`, y `isInvoiced` en `true` sin
 * archivo no existe —el backend no deja crearlo—, así que no hay que programar
 * ese caso.
 */
export const VehicleExpenseSchema = z.object({
    id: z.number(),
    vehicleId: z.number(),
    category: z.string(),
    nature: z.string(),
    amount: z.string(),
    expenseDate: z.string(),
    description: z.string(),
    /** Booleano JSON de verdad, nunca `1` ni `"1"`. **Inmutable** tras el alta. */
    isInvoiced: z.boolean(),
    /** URL pública, sin token y sin caducidad. No sirve como identificador. */
    invoiceUrl: z.string().nullable(),
    /** `jpg`, `png` o `pdf`. Nunca `jpeg`: un JPEG se guarda como `jpg`. */
    invoiceType: z.string().nullable(),
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

/**
 * El alta devuelve el gasto creado, y es la única forma de saber si la factura
 * quedó: con el interruptor apagado el backend descarta el archivo **en
 * silencio** y responde 201 igual, así que el front compara lo que capturó el
 * usuario con el `isInvoiced` que volvió.
 */
export const CreatedVehicleExpenseSchema = ApiResponseSchema.extend({
    data: VehicleExpenseSchema
});
