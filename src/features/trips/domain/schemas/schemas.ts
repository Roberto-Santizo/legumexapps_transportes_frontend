import { ApiPaginatedResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Los tres estados del viaje, **crudos y en inglés**: la API no los traduce y
 * `"PENDING"` o `"pendiente"` son un 422. No existe `cancelled` —un viaje que
 * no se hará se borra— y **no hay máquina de estados**: el administrador los
 * mueve en cualquier orden, así que un `finished` puede volver a `pending`
 * conservando sus dos fechas de ejecución.
 */
export const TripStatusSchema = z.enum(['pending', 'in_route', 'finished']);

/**
 * Un viaje de exportación: la carga que sale de una planta, pasa por un puerto
 * y termina en el extranjero. **Treinta y tres claves, siempre las treinta y
 * tres**, y solo en el **detalle** —el listado devuelve una fila recortada, ver
 * `TripListItemSchema`—, en camelCase y con las relaciones planas —`clientId` + `clientName`,
 * nunca un objeto anidado—. La API manda una más, `vehicleImage`, que aquí no
 * se modela porque la ficha del viaje no pinta la foto de la unidad.
 *
 * El viaje **no pertenece a ninguna empresa**: no hay `carrierId` en la tabla.
 * Nace sin dueño y la empresa transportista se lo queda al asignarlo. De ahí
 * salen `pilotId`, `vehicleId` y `assignedById`, los tres en `null` mientras
 * nadie lo tome.
 *
 * Las siete fechas llegan en `d-m-Y h:i:s A`, que **no es ISO 8601**:
 * `new Date(...)` sobre ellas devuelve `Invalid Date`. Se desarman con los
 * helpers de `infrastructure/utils`.
 */
export const TripSchema = z.object({
    id: z.number(),
    /** MAYÚSCULAS con espacios colapsados. **No es único**: dos viajes pueden compartirlo. */
    order: z.string(),
    status: TripStatusSchema,
    clientId: z.number(),
    clientName: z.string().nullable(),
    shippingLineId: z.number(),
    shippingLineName: z.string().nullable(),
    departurePointId: z.number(),
    departurePointName: z.string().nullable(),
    /** El **puerto** de salida al mar. Siempre una `location` de tipo `port`. */
    locationId: z.number(),
    locationName: z.string().nullable(),
    /** Destino final en el extranjero. Texto libre: ningún catálogo lo respalda. */
    destination: z.string(),
    /** MAYÚSCULAS con espacios colapsados, como `order`. **Tampoco es único.** */
    container: z.string(),
    /** Medio de transporte, descriptivo. No tiene relación con el `vehicleId` asignado. */
    transport: z.string(),
    /** Lo planificado. Formato `d-m-Y h:i:s A`. */
    recolectionDate: z.string(),
    shipDate: z.string(),
    /** Lo ejecutado. `null` hasta que el piloto llama a `/start` y `/finish`. */
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    /**
     * Polilínea codificada de Google, tal como la mandó el front. **Puede
     * quedar obsoleta**: la API no la recalcula nunca y no avisa si los
     * extremos cambiaron sin remandarla.
     */
    polyline: z.string(),
    /** Pares `[lat, lng]` decodificados de `polyline` en cada lectura. Campo calculado. */
    points: z.array(z.tuple([z.number(), z.number()])),
    /** Obligatorio, nunca `null`: el único canal de instrucciones hacia la empresa. */
    observations: z.string(),
    pilotId: z.number().nullable(),
    pilotName: z.string().nullable(),
    /**
     * Las dos fotos del piloto —anverso del DPI y de la licencia—, **con
     * prefijo** porque el detalle mezcla cuatro entidades y un `dpiImage`
     * suelto no diría de quién es. Son URLs **absolutas y públicas**: se pintan
     * tal cual como `src`, sin token y sin componer nada. El viaje no guarda
     * copia, las resuelve desde el piloto.
     *
     * **Van siempre juntas**: o las dos con URL, o las dos en `null`. Y `null`
     * no es un error —hay que mirar `pilotId` para leerlo—: sin `pilotId` el
     * viaje sigue en la bolsa; con `pilotId` es un piloto que se registró antes
     * de que el alta pidiera documentos. No se pueden subir después: solo
     * entran por `POST /api/auth/register` y no hay forma de reemplazarlos.
     */
    pilotDpiImage: z.string().nullable(),
    pilotLicenseImage: z.string().nullable(),
    vehicleId: z.number().nullable(),
    /** Aquí el par es id + **placa**, no id + nombre. */
    vehiclePlate: z.string().nullable(),
    /** El **usuario** que asignó. El ámbito de lectura compara su **empresa**. */
    assignedById: z.number().nullable(),
    assignedByName: z.string().nullable(),
    /** El administrador que publicó el viaje. No hay `registeredById` y el PATCH no lo reescribe. */
    registeredByName: z.string().nullable(),
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
    /**
     * **`null` en siete de los ocho endpoints.** Solo trae valor en la
     * respuesta del propio `DELETE`, que pinta la fila recién dada de baja.
     */
    deletedAt: z.string().nullable(),
});

/**
 * La fila del listado, que **ya no es el viaje entero**: `GET /api/trips`
 * devuelve quince claves —las que se pintan en la tabla— y deja las otras
 * dieciocho para el detalle. Las que faltan no son opcionales, **no llegan**:
 * los ids de los catálogos, `destination`, `transport`, la `polyline` con sus
 * `points`, `pilotId`/`vehicleId`, los dos documentos del piloto, el par
 * `assignedBy*` y las tres fechas de auditoría.
 *
 * Dos consecuencias para el front:
 *
 * - **La bolsa ya no se reconoce por `assignedById`.** Sin él, lo único que
 *   distingue un viaje sin dueño es que no tiene tripulación, y sirve porque
 *   `/assignment` exige piloto y vehículo juntos: quien tiene piloto fue
 *   tomado.
 * - **Reasignar desde la tabla no puede precargar nada**: los dos ids de la
 *   tripulación actual solo están en el detalle.
 *
 * Las fechas llegan igual que en el detalle, en `d-m-Y h:i:s A`.
 */
export const TripListItemSchema = z.object({
    id: z.number(),
    /** MAYÚSCULAS con espacios colapsados. **No es único**: dos viajes pueden compartirlo. */
    order: z.string(),
    status: TripStatusSchema,
    shippingLineName: z.string().nullable(),
    departurePointName: z.string().nullable(),
    /** El **puerto** de salida al mar. El destino final solo está en el detalle. */
    locationName: z.string().nullable(),
    /** MAYÚSCULAS con espacios colapsados, como `order`. **Tampoco es único.** */
    container: z.string(),
    /** Lo planificado. Formato `d-m-Y h:i:s A`. */
    recolectionDate: z.string(),
    shipDate: z.string(),
    /** Lo ejecutado. `null` hasta que el piloto llama a `/start` y `/finish`. */
    startDate: z.string().nullable(),
    endDate: z.string().nullable(),
    observations: z.string(),
    pilotName: z.string().nullable(),
    /** Aquí el par es id + **placa**, pero el id se queda en el detalle. */
    vehiclePlate: z.string().nullable(),
    registeredByName: z.string().nullable(),
});

/**
 * Los metadatos van **aplanados en la raíz** del sobre, no bajo `meta`, y solo
 * cuando se manda un `limit`: sin él la API devuelve la colección completa y no
 * manda ninguno. `lastPage` es propio de este dominio.
 */
export const PaginatedTripsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(TripListItemSchema),
    lastPage: z.number().optional(),
});

/* ------------------------------------------------------------------ *
 * Rastro en vivo
 * ------------------------------------------------------------------ */

/**
 * Un punto del recorrido **real**, tal como lo devuelve
 * `GET /api/trips/{trip}/positions`. Cinco claves y ninguna más.
 *
 * Dos avisos que el tipo no puede dar por sí solo:
 *
 * - **`latitude` y `longitude` son cadenas**, con ocho decimales fijos
 *   (`"14.62807400"`). Hay que `parseFloat` antes de pintarlas. No se parecen
 *   a los `points` del viaje, que sí son números.
 * - **`recordedAt` no es ISO 8601**: llega en el `d-m-Y h:i:s A` del proyecto y
 *   es la hora del **servidor**, no la del dispositivo del piloto.
 *
 * No trae `tripId`: quien pide el rastro ya lo lleva en la URL.
 */
export const TripPositionSchema = z.object({
    /** Sirve para deduplicar frente al `GET`, pero **el websocket no lo manda**. */
    id: z.number(),
    latitude: z.string(),
    longitude: z.string(),
    recordedAt: z.string().nullable(),
    /** El usuario que reportó. Sale del token, nunca del cuerpo. */
    pilotId: z.number(),
});

/**
 * Lo que empuja el canal `trips.{tripId}` en el evento `.trip.position.updated`.
 * **Seis claves: una más y una menos que el recurso HTTP.** Trae `tripId` y
 * `pilotName`, que el recurso no tiene, y **no trae `id`**, que el recurso sí.
 *
 * Esa ausencia es la razón de que la deduplicación no pueda apoyarse en el `id`
 * como sugiere la documentación: ver `tripPositionKey` en `infrastructure/utils`.
 *
 * Se valida igual que una respuesta HTTP porque entra por un canal que no pasa
 * por el datasource.
 */
export const TripPositionEventSchema = z.object({
    tripId: z.number(),
    latitude: z.string(),
    longitude: z.string(),
    recordedAt: z.string().nullable(),
    pilotId: z.number(),
    /** El nombre del piloto **solo llega por aquí**: el `GET` no lo devuelve. */
    pilotName: z.string(),
});
