import type { FuelTypeSchema, PaginatedTripsSchema, TripFuelSchema, TripFuelsSchema, TripListItemSchema, TripPositionEventSchema, TripPositionSchema, TripSchema, TripStatusSchema, TripTimeoutSchema } from "@/features/trips/trips";
import type { z } from "zod";

export type PaginatedTrips = z.infer<typeof PaginatedTripsSchema>;
/** El viaje completo. **Solo el detalle lo devuelve.** */
export type Trip = z.infer<typeof TripSchema>;
/** La fila del listado: quince de las treinta y tres claves del viaje. */
export type TripListItem = z.infer<typeof TripListItemSchema>;

/**
 * Lo que sirve para las piezas que se montan **desde las dos pantallas** —el
 * diálogo de baja y el de asignación—: las quince claves que siempre llegan,
 * más las del detalle como opcionales. Una fila del listado y un viaje entero
 * encajan los dos, y quien lee una clave del detalle tiene que contar con que
 * venga `undefined`.
 */
export type TripSummary = TripListItem & Partial<Omit<Trip, keyof TripListItem>>;
/** Cadena cruda del enum, en inglés: se traduce solo al pintarla. */
export type TripStatus = z.infer<typeof TripStatusSchema>;

/** Par `[latitud, longitud]`, en ese orden. */
export type LatLng = [number, number];

/**
 * Los doce campos del alta, **los doce obligatorios**. Otras cinco claves
 * —`status`, `pilotId`, `vehicleId`, `assignedBy` y `registeredBy`— se
 * descartan en el servidor sin error: el viaje nace `pending`, sin tripulación
 * y con el autor sacado del token.
 */
export type TripForm = {
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
    /** La resuelve el front con `GET /api/places/directions`. La API no la calcula. */
    polyline: string;
    observations: string;
}

/**
 * El cuerpo del `PATCH`: los mismos doce, todos opcionales, **más `status`** y
 * **sin `pilotId` ni `vehicleId`** —mandarlos responde 200 sin cambiar nada—.
 *
 * Opcional no es vaciable: una clave en `null` o en blanco es 422. Un cuerpo
 * vacío responde 200 sin tocar siquiera `updatedAt`.
 */
export type TripUpdateForm = Partial<TripForm> & {
    status?: TripStatus;
}

/**
 * El estado del formulario de alta y edición. `status` solo se pinta al
 * editar, y los tres campos de abajo son andamiaje: sirven para resolver la
 * ruta y no viajan al servidor.
 */
export type TripFormValues = TripForm & {
    status?: TripStatus;
}

/**
 * Los **cuatro** campos de `/assignment`, los cuatro obligatorios. `null` en
 * cualquiera es 422: la desasignación no existe en este dominio. `assignedBy`
 * no se envía —sale del token—.
 *
 * Los dos de combustible son un añadido **incompatible y sin periodo de
 * gracia**: mandar solo la tripulación responde 422 en *todas* las
 * asignaciones. La primera carga se inserta en la misma transacción que la
 * asignación, así que ningún viaje queda tomado con cero cargas —y reasignar
 * **añade otra carga**, no pisa la anterior—.
 */
export type TripAssignmentForm = {
    pilotId: number;
    vehicleId: number;
    /** Los galones de la primera carga. `min:0.01`: cero y negativos son 422. */
    fuelGallons: number;
    fuelType: FuelType;
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
}

/** Los campos del formulario a los que se puede anclar un error del backend. */
export type TripField = keyof TripForm | 'status';

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
 * Paradas (tiempos muertos)
 * ------------------------------------------------------------------ */

/**
 * Una parada del viaje. Ojo: `latitude`/`longitude` son cadenas, las dos fechas
 * no son ISO y `endedAt === null` es la parada todavía abierta.
 */
export type TripTimeout = z.infer<typeof TripTimeoutSchema>;
