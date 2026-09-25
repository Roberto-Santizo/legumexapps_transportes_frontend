import type { FuelTypeSchema, PaginatedTripsSchema, TripCostFuelTypeSchema, TripCostSchema, TripExpenseSchema, TripExpensesSchema, TripFuelSchema, TripFuelsSchema, TripListItemSchema, TripPositionEventSchema, TripPositionSchema, TripSchema, TripStatusSchema, TripTimeoutSchema } from "@/features/trips/trips";
import type { TripProductLine, TripProductLineValues } from "@/features/trip-finished-products/trip-finished-products";
import type { z } from "zod";

export type PaginatedTrips = z.infer<typeof PaginatedTripsSchema>;
/** El viaje completo. **Solo el detalle lo devuelve.** */
export type Trip = z.infer<typeof TripSchema>;
/** La fila del listado: diecinueve de las cuarenta y dos claves del viaje. */
export type TripListItem = z.infer<typeof TripListItemSchema>;

/**
 * Lo que sirve para las piezas que se montan **desde las dos pantallas** —el
 * diálogo de baja y el de asignación—: las diecinueve claves que siempre
 * llegan, más las del detalle como opcionales. Una fila del listado y un viaje
 * entero encajan los dos, y quien lee una clave del detalle tiene que contar
 * con que venga `undefined`.
 */
export type TripSummary = TripListItem & Partial<Omit<Trip, keyof TripListItem>>;
/** Cadena cruda del enum, en inglés: se traduce solo al pintarla. */
export type TripStatus = z.infer<typeof TripStatusSchema>;

/** Par `[latitud, longitud]`, en ese orden. */
export type LatLng = [number, number];

/**
 * La ruta prevista son **tres campos que viajan juntos** (SPEC 30), y los tres
 * salen de la **misma** respuesta de `GET /api/places/directions` sin convertir
 * nada: `polyline`, `distanceKilometers` → `estimatedKilometers` y
 * `durationHours` → `estimatedHours` (horas decimales). La API los guarda tal
 * cual: no calcula, no recalcula ni coteja los números con la línea.
 *
 * En el `PATCH` son **todo o nada**: mandar uno solo o dos de los tres es 422.
 */
export type TripRouteForm = {
    /** La resuelve el front con `GET /api/places/directions`. La API no la calcula. */
    polyline: string;
    /** `0 ≤ x ≤ 999999.99`. Viaja como número; vuelve como cadena de dos decimales. */
    estimatedKilometers: number;
    /** `0 ≤ x ≤ 9999.99`, en **horas decimales**. Viaja como número. */
    estimatedHours: number;
}

/**
 * Los quince campos del alta, **los quince obligatorios** (catorce hasta SPEC
 * 37: un `POST` sin `products` es 422). Otras cinco claves —`status`, `pilotId`,
 * `vehicleId`, `assignedBy` y `registeredBy`— se descartan en el servidor sin
 * error: el viaje nace `pending`, sin tripulación y con el autor sacado del
 * token.
 */
export type TripForm = TripRouteForm & {
    /** Máx 255. El backend lo guarda en MAYÚSCULAS con espacios colapsados. */
    order: string;
    clientId: number;
    shippingLineId: number;
    departurePointId: number;
    /** Debe ser una `location` de tipo `port` y activa, o la API responde 400. */
    locationId: number;
    /** Texto libre, máx 255. Se guarda tal como se teclea. */
    destination: string;
    container: string;
    transport: string;
    /** `Y-m-d H:i:s`. En el alta debe ser futura. **Nunca el formato de salida.** */
    recolectionDate: string;
    /** `Y-m-d H:i:s`. En el alta, futura y >= `recolectionDate`. */
    shipDate: string;
    observations: string;
    /**
     * SPEC 37: al menos una línea, sin repetir producto, y cada producto del
     * cliente del viaje. El viaje y sus líneas se guardan en una transacción.
     */
    products: TripProductLine[];
}

/**
 * El cuerpo del `PATCH`: los mismos catorce, todos opcionales, **más `status`**
 * y **sin `pilotId` ni `vehicleId`** —mandarlos responde 200 sin cambiar nada—,
 * con una salvedad que el tipo hace cumplir: la ruta va **entera o no va**. Un
 * `PATCH` con solo `polyline`, válido hasta SPEC 30, ya no compila y ya no pasa.
 *
 * Opcional no es vaciable: una clave en `null` o en blanco es 422. Un cuerpo
 * vacío responde 200 sin tocar siquiera `updatedAt`.
 */
export type TripUpdateForm = Partial<Omit<TripForm, keyof TripRouteForm | 'products'>>
    & (TripRouteForm | { polyline?: never; estimatedKilometers?: never; estimatedHours?: never })
    & { status?: TripStatus };

/**
 * El estado del formulario de alta y edición, que **no es el payload**: la
 * ruta nace vacía y se rellena sola cuando `/directions` responde, así que sus
 * tres campos son opcionales aquí y obligatorios al enviar. El `required` del
 * campo oculto de `polyline` es lo que garantiza el paso de uno a otro, y como
 * los tres se escriben juntos, con la línea llegan también las dos cifras.
 * `status` solo se pinta al editar.
 */
export type TripFormValues = Omit<TripForm, keyof TripRouteForm | 'products'> & Partial<TripRouteForm> & {
    status?: TripStatus;
    /** Solo en el alta: las líneas del viaje ya creado se editan desde el detalle. */
    products?: TripProductLineValues[];
}

/**
 * Los **cuatro** campos obligatorios de `/assignment` más **dos opcionales**.
 * `null` en cualquiera de los cuatro es 422: la desasignación no existe en
 * este dominio. `assignedBy` no se envía —sale del token—.
 *
 * Los dos de combustible son un añadido **incompatible y sin periodo de
 * gracia**: mandar solo la tripulación responde 422 en *todas* las
 * asignaciones. La primera carga se inserta en la misma transacción que la
 * asignación, así que ningún viaje queda tomado con cero cargas —y reasignar
 * **añade otra carga**, no pisa la anterior—.
 *
 * Los dos de viáticos (SPEC 31) son **opcionales y no rompen nada**: con
 * `expenseAmount` la asignación crea el primer viático en la misma
 * transacción; sin él, nada cambia. `expenseDescription` sin `expenseAmount`
 * se ignora en silencio. Reasignar con monto **añade otro viático**.
 */
export type TripAssignmentForm = {
    pilotId: number;
    vehicleId: number;
    /** Los galones de la primera carga. `min:0.01`: cero y negativos son 422. */
    fuelGallons: number;
    fuelType: FuelType;
    /** El dinero del primer viático. `min:0.01` si se manda; ausente = sin viático. */
    expenseAmount?: number;
    /** Texto libre, máx 255. Solo viaja junto a `expenseAmount`. */
    expenseDescription?: string;
}

/**
 * El estado del formulario de asignación, que **no es el payload**: la
 * tripulación puede llegar precargada desde el detalle, pero los dos campos de
 * combustible nacen vacíos siempre —una carga nueva no se hereda de la
 * anterior— y por eso son opcionales aquí y obligatorios al enviar. La
 * validación `required` es lo que garantiza el paso de uno a otro.
 */
export type TripAssignmentFormValues = {
    pilotId: number;
    vehicleId: number;
    fuelGallons?: number;
    fuelType?: FuelType;
    /** Vacío o `NaN` significa «sin viático»: el payload lo omite. */
    expenseAmount?: number;
    expenseDescription?: string;
}

/** Los campos del formulario a los que se puede anclar un error del backend. */
export type TripField = Exclude<keyof TripForm, 'products'> | 'status';

/**
 * Los diez filtros del listado. **Todos tolerantes**: un valor inválido se
 * ignora y devuelve el listado completo, nunca 422 ni una lista vacía.
 *
 * El ámbito del rol se aplica **antes** que los filtros: ninguna combinación
 * revela un viaje que ya tomó otra empresa.
 */
export type TripFilters = {
    /** Coincidencia exacta y sensible a mayúsculas: `?status=PENDING` se ignora. */
    status?: string;
    clientId?: string;
    shippingLineId?: string;
    locationId?: string;
    pilotId?: string;
    vehicleId?: string;
    /** `Y-m-d` **estricto**, sobre `recolectionDate`. `31-12-2026` se ignora. */
    dateFrom?: string;
    /** `Y-m-d` estricto. Incluye el día entero. */
    dateTo?: string;
    /** `LIKE` sobre `order` **y** `container`. Insensible a mayúsculas. */
    search?: string;
}

/** Un punto del recorrido real. Ojo: `latitude`/`longitude` son cadenas. */
export type TripPosition = z.infer<typeof TripPositionSchema>;

/** El payload del websocket: trae `tripId` y `pilotName`, y **no** trae `id`. */
export type TripPositionEvent = z.infer<typeof TripPositionEventSchema>;

/**
 * En qué punto está el seguimiento en vivo. No es el estado del viaje: es el
 * del socket, y hay que distinguirlo porque un mapa quieto puede significar
 * cuatro cosas muy distintas.
 *
 * - `live` — conectado y suscrito: los puntos nuevos llegan solos.
 * - `connecting` — negociando o reintentando.
 * - `offline` — Reverb no responde. El rastro cargado sigue siendo válido.
 * - `unavailable` — faltan las variables `VITE_REVERB_*` o no hay sesión: no se
 *   llegó ni a intentar.
 * - `forbidden` — el canal rechazó la suscripción (403 de ámbito o rol).
 */
export type TripTrackingStatus = 'live' | 'connecting' | 'offline' | 'unavailable' | 'forbidden';

/* ------------------------------------------------------------------ *
 * Cargas de combustible
 * ------------------------------------------------------------------ */

/** Cadena cruda del enum, en inglés y en minúsculas: se traduce solo al pintarla. */
export type FuelType = z.infer<typeof FuelTypeSchema>;

/** Una carga de combustible. Ojo: `gallons` es cadena y `loadedAt` no es ISO. */
export type TripFuel = z.infer<typeof TripFuelSchema>;

/** El sobre del listado, con `totalGallons` en la raíz. */
export type TripFuels = z.infer<typeof TripFuelsSchema>;

/**
 * Los dos campos del alta de una carga, **los dos obligatorios**. Otras cuatro
 * claves —`tripId`, `loadedAt`, `confirmedBy` y `registeredBy`— se descartan en
 * silencio: el viaje va en la URL, la fecha la pone el servidor al confirmar y
 * los dos autores salen de sus tokens.
 */
export type TripFuelForm = {
    /** `min:0.01`: cero y negativos son 422. Viaja como número. */
    gallons: number;
    fuelType: FuelType;
}

/* ------------------------------------------------------------------ *
 * Viáticos
 * ------------------------------------------------------------------ */

/** Un viático. Ojo: `amount` es cadena y `receivedAt` no es ISO. */
export type TripExpense = z.infer<typeof TripExpenseSchema>;

/** El sobre del listado, con `totalAmount` en la raíz. */
export type TripExpenses = z.infer<typeof TripExpensesSchema>;

/**
 * El alta de un viático: un monto obligatorio y una descripción opcional.
 * Otras cuatro claves —`tripId`, `receivedAt`, `confirmedBy` y
 * `registeredBy`— se descartan en silencio, como en las cargas.
 */
export type TripExpenseForm = {
    /** `min:0.01`, `max:99999999.99`. Viaja como número. GTQ. */
    amount: number;
    /** Texto libre, máx 255. Solo `trim`; en blanco se guarda como `null`. */
    description?: string | null;
}

/* ------------------------------------------------------------------ *
 * Paradas (tiempos muertos)
 * ------------------------------------------------------------------ */

/**
 * Una parada del viaje. Ojo: `latitude`/`longitude` son cadenas, las dos fechas
 * no son ISO y `endedAt === null` es la parada todavía abierta.
 */
export type TripTimeout = z.infer<typeof TripTimeoutSchema>;

/* ------------------------------------------------------------------ *
 * Costo directo
 * ------------------------------------------------------------------ */

/** Un tipo de combustible del costo. `pricePerGallon: null` = falta historial de precios. */
export type TripCostFuelType = z.infer<typeof TripCostFuelTypeSchema>;

/** El costo **directo** de un viaje finalizado. Todo importe es cadena salvo `expenses.count`. */
export type TripCost = z.infer<typeof TripCostSchema>;
