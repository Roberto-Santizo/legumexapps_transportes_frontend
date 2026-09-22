import { ApiResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * El tablero no envuelve un modelo: cada endpoint devuelve una forma propia,
 * de solo lectura, calculada en vivo sobre lo que guardan los demás dominios.
 *
 * Dos trampas de tipo que cruzan los cuatro objetos: el dinero, los galones y
 * `kilometersPerGallon` son **cadenas** de dos decimales (`"15300.50"`), las
 * coordenadas cadenas de ocho, y las fechas vienen en `d-m-Y h:i:s A`, que no
 * es ISO 8601 —`new Date(...)` devuelve `Invalid Date`—.
 */

const CountedRowSchema = z.object({ total: z.number() });

/**
 * `byStatus` trae **siempre** las tres claves, a `0` sin filas, y en camelCase
 * (`inRoute`), no el valor crudo del enum. `total` es la suma de las tres.
 */
export const TripsByStatusSchema = z.object({
    pending: z.number(),
    inRoute: z.number(),
    finished: z.number(),
});

/**
 * Los desgloses por entidad solo traen filas con al menos un viaje y llegan ya
 * ordenados `total desc, id asc`. Un cliente o naviera **borrados** siguen
 * apareciendo si tienen viajes.
 */
export const TripsByCarrierSchema = CountedRowSchema.extend({
    carrierId: z.number(),
    carrierName: z.string(),
});

export const TripsByClientSchema = CountedRowSchema.extend({
    clientId: z.number(),
    clientName: z.string(),
});

export const TripsByShippingLineSchema = CountedRowSchema.extend({
    shippingLineId: z.number(),
    shippingLineName: z.string(),
});

export const TripsByLocationSchema = CountedRowSchema.extend({
    locationId: z.number(),
    locationName: z.string(),
});

/** `month` como `YYYY-MM`, **solo meses con viajes**, en orden ascendente. Los huecos los rellena el front. */
export const TripsByMonthSchema = CountedRowSchema.extend({
    month: z.string(),
});

/**
 * `byCarrier` **no suma `total`**: la empresa del viaje es la de `assigned_by`,
 * y los viajes sin asignar no tienen empresa. Sí cuentan en `total` y en
 * `unassigned`. No es una inconsistencia que haya que señalar.
 */
export const TripsSummarySchema = z.object({
    total: z.number(),
    /** `pending` sin piloto ni vehículo. Con `carrierId` es siempre `0`. */
    unassigned: z.number(),
    byStatus: TripsByStatusSchema,
    byCarrier: z.array(TripsByCarrierSchema),
    byClient: z.array(TripsByClientSchema),
    byShippingLine: z.array(TripsByShippingLineSchema),
    byLocation: z.array(TripsByLocationSchema),
    byMonth: z.array(TripsByMonthSchema),
});

/** El punto de mayor `recorded_at`; `null` si el viaje no tiene ninguno. */
export const TripLastPositionSchema = z.object({
    latitude: z.string(),
    longitude: z.string(),
    recordedAt: z.string(),
});

/**
 * La parada con `endedAt` nulo. `stoppedMinutes` se mide contra `now()` **del
 * servidor** y cambia en cada lectura: se pinta tal cual, sin recalcular con
 * el reloj del cliente.
 */
export const TripOpenTimeoutSchema = z.object({
    startedAt: z.string(),
    latitude: z.string(),
    longitude: z.string(),
    stoppedMinutes: z.number(),
});

/**
 * Un viaje `in_route`. No trae `status` —siempre es `in_route`— ni los ids de
 * cliente y ubicación: para eso está `GET /api/trips/{trip}`. `tripId` es
 * `trips.id` y sirve para enlazar al detalle y al seguimiento.
 */
export const TripInRouteSchema = z.object({
    tripId: z.number(),
    order: z.string(),
    container: z.string(),
    carrierId: z.number().nullable(),
    carrierName: z.string().nullable(),
    pilotId: z.number(),
    pilotName: z.string().nullable(),
    vehicleId: z.number(),
    vehiclePlate: z.string().nullable(),
    clientName: z.string().nullable(),
    locationName: z.string().nullable(),
    startDate: z.string().nullable(),
    lastPosition: TripLastPositionSchema.nullable(),
    /** Galones de cargas **confirmadas**. */
    totalFuelGallons: z.string(),
    /** Galones que el piloto todavía no confirmó. No están en ningún otro Resource. */
    unconfirmedFuelGallons: z.string(),
    openTimeout: TripOpenTimeoutSchema.nullable(),
});

export const CountAndAmountSchema = z.object({
    count: z.number(),
    /** GTQ, dos decimales, como cadena. */
    totalAmount: z.string(),
});

/** `category` con el valor crudo de `VehicleExpenseCategory`; solo categorías con datos, orden `totalAmount desc`. */
export const ExpensesByCategorySchema = CountAndAmountSchema.extend({
    category: z.string(),
});

/** Aquí todo gasto tiene empresa (`vehicles.carrier_id`, sin importar el `status` del vehículo): la suma sí coincide con `count`. */
export const ExpensesByCarrierSchema = CountAndAmountSchema.extend({
    carrierId: z.number(),
    carrierName: z.string(),
});

export const ExpensesByMonthSchema = CountAndAmountSchema.extend({
    month: z.string(),
});

/**
 * `byNature`, `invoiced` y `notInvoiced` existen **siempre**, a cero si no hay
 * filas. Se cumple `invoiced.count + notInvoiced.count === count` y los montos
 * suman `totalAmount`.
 */
export const VehicleExpensesSummarySchema = z.object({
    totalAmount: z.string(),
    count: z.number(),
    byCategory: z.array(ExpensesByCategorySchema),
    byNature: z.object({
        preventive: CountAndAmountSchema,
        corrective: CountAndAmountSchema,
    }),
    invoiced: CountAndAmountSchema,
    notInvoiced: CountAndAmountSchema,
    byCarrier: z.array(ExpensesByCarrierSchema),
    byMonth: z.array(ExpensesByMonthSchema),
});

/** El viaje `in_route` de `start_date` más reciente del vehículo. */
export const DashboardCurrentTripSchema = z.object({
    tripId: z.number(),
    order: z.string(),
    container: z.string(),
    pilotName: z.string().nullable(),
    startDate: z.string().nullable(),
});

/**
 * Un vehículo de la flota, **incluidos** los `inactive` y `under_repair`. Es
 * un recorte: no trae `brand`, `model`, `year`, `capacity`, `engineNumber`,
 * `image`, `purchasePrice` ni `monthlyInsuranceCost`.
 *
 * `inRoute` es `true` exactamente cuando `currentTrip` no es `null`, y el
 * tablero no valida coherencia: un `inactive` puede salir en ruta.
 */
export const DashboardVehicleSchema = z.object({
    id: z.number(),
    plate: z.string(),
    type: z.enum(["truck", "van", "trailer", "pickup"]),
    status: z.enum(["active", "inactive", "under_repair"]),
    condition: z.enum(["new", "used"]),
    mileage: z.number(),
    kilometersPerGallon: z.string(),
    carrierId: z.number(),
    carrierName: z.string().nullable(),
    inRoute: z.boolean(),
    currentTrip: DashboardCurrentTripSchema.nullable(),
});

/**
 * Los metadatos de paginación llegan **en la raíz** del sobre, no bajo `meta`,
 * y solo cuando se manda un `limit` numérico. Sin `limit`, `data` trae toda
 * la flota y no hay `total`. `lastPage` es propio de este dominio.
 */
export const DashboardVehiclesSchema = ApiResponseSchema.extend({
    data: z.array(DashboardVehicleSchema),
    total: z.number().optional(),
    currentPage: z.number().optional(),
    lastPage: z.number().optional(),
});
