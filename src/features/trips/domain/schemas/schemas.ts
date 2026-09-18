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
 * y termina en el extranjero. **Treinta y ocho claves**, y solo en el
 * **detalle** —el listado devuelve una fila recortada, ver
 * `TripListItemSchema`—, en camelCase y con las relaciones planas —`clientId` + `clientName`,
 * nunca un objeto anidado—. La API manda una más, `vehicleImage`, que aquí no
 * se modela porque la ficha del viaje no pinta la foto de la unidad.
 *
 * Cuatro de las claves llegaron en specs aditivas posteriores al alta del
 * dominio —`traveledPolyline`/`traveledPoints` (SPEC 28) y
 * `estimatedKilometers`/`estimatedHours` (SPEC 30)— y se leen con `default`:
 * un backend anterior no las manda y el viaje entero fallaría el parse por
 * claves informativas. El tipo que sale es el estricto; la tolerancia es solo
 * de entrada.
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
    /**
     * Las dos estimaciones de la ruta **prevista** (SPEC 30), como cadenas de
     * dos decimales igual que `totalFuelGallons`: kilómetros (`"104.32"`) y
     * **horas decimales** (`"1.75"` es 1 h 45 min, no «1:75»). Son el
     * `distanceKilometers` y el `durationHours` de `/places/directions` que
     * mandó el front, guardados tal cual: la API no los calcula, no los coteja
     * con `polyline` ni con el rastro, y no son un ETA.
     *
     * **`null` significa exactamente «viaje anterior a SPEC 30»**: no hubo
     * backfill y por la API ya no se puede crear ni editar un viaje que quede
     * sin ellas. Quedan obsoletas junto a `polyline` si un `PATCH` cambia el
     * destino sin remandar la ruta.
     */
    estimatedKilometers: z.string().nullable().default(null),
    estimatedHours: z.string().nullable().default(null),
    /**
     * La ruta **real** (SPEC 28): todo el rastro de posiciones del viaje
     * codificado en el mismo formato que `polyline`, sin simplificar. **La
     * escribe el servidor una sola vez, en `/finish`**; ningún body la acepta.
     *
     * `null` por tres motivos que la API no distingue: el viaje no ha terminado
     * —aunque esté `in_route` con miles de puntos reportados—, terminó sin ni un
     * punto, o terminó antes de la spec. Para el rastro en vivo siguen el
     * websocket y `GET /trips/{trip}/positions`.
     */
    traveledPolyline: z.string().nullable().default(null),
    /**
     * Pares `[lat, lng]` decodificados de `traveledPolyline`, el espejo de
     * `points` para la ruta real. **`[]` —nunca `null`— siempre que
     * `traveledPolyline` sea `null`.** A cinco decimales (formato de Google), no
     * a los ocho de `/positions`: el rastro exacto sigue allí.
     */
    traveledPoints: z.array(z.tuple([z.number(), z.number()])).default([]),
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
    /**
     * Los galones **confirmados** del viaje, como cadena de dos decimales. La
     * misma regla que el `totalGallons` del listado de cargas: lo registrado
     * pero sin confirmar **no suma**, así que un viaje recién asignado trae
     * `"0.00"` teniendo ya una carga. No es un error, es el estado normal.
     *
     * Opcional a propósito: llega en los siete endpoints del detalle, pero un
     * backend anterior a esta spec no la manda y el viaje entero fallaría el
     * parse por una clave informativa.
     */
    totalFuelGallons: z.string().optional(),
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
 * devuelve diecisiete claves —las que se pintan en la tabla— y deja las otras
 * veintidós para el detalle. Las que faltan no son opcionales, **no llegan**:
 * los ids de los catálogos, `destination`, `transport`, la `polyline` con sus
 * `points`, la ruta real, `pilotId`/`vehicleId`, los dos documentos del piloto,
 * el par `assignedBy*`, el combustible y las tres fechas de auditoría.
 *
 * Las dos estimaciones de SPEC 30 **sí** vienen —al revés que `polyline`—
 * porque son dos escalares baratos que bastan para pintar «104.32 km · 1 h 45
 * min» en cada fila sin pedir el detalle.
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
    /** Las mismas cadenas de dos decimales que en el detalle; `null` en viajes anteriores a SPEC 30. */
    estimatedKilometers: z.string().nullable().default(null),
    estimatedHours: z.string().nullable().default(null),
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

/* ------------------------------------------------------------------ *
 * Cargas de combustible
 * ------------------------------------------------------------------ */

/**
 * El enum crudo del backend, **en inglés y en minúsculas**: `DIESEL` es un 422.
 * Es el mismo catálogo que el de los precios de combustible, pero aquí no es
 * una llave foránea —una carga puede declarar un tipo que no tiene precio
 * vigente— sino una etiqueta.
 */
export const FuelTypeSchema = z.enum(['regular', 'premium', 'diesel', 'diesel_premium']);

/**
 * Una carga de combustible: lo que la empresa transportista le entrega al
 * viaje. **Ocho claves**, y dos avisos que el tipo no puede dar solo:
 *
 * - **`gallons` es una cadena** de dos decimales (`"45.50"`), no un número:
 *   hay que `parseFloat` antes de sumar o comparar.
 * - **`loadedAt` no es ISO 8601.** Llega en el `d-m-Y h:i:s A` del proyecto y
 *   es la hora del **servidor** al confirmar, nunca la del dispositivo.
 *
 * La tabla es **append-only**: no existe editar ni borrar una carga, no se
 * puede desconfirmar y los galones no admiten negativos, así que un error de
 * tecleo no se puede compensar ni siquiera con otra carga.
 */
export const TripFuelSchema = z.object({
    /** El id de la **carga**, no el del viaje. */
    id: z.number(),
    /** Sí viaja, al contrario que en `TripPosition`: la confirmación vive fuera del viaje. */
    tripId: z.number(),
    /** ⚠️ Cadena de dos decimales, no número. */
    gallons: z.string(),
    fuelType: FuelTypeSchema,
    /** **Derivado** de `loadedAt`: no hay ninguna columna `status`. */
    isConfirmed: z.boolean(),
    /** ⚠️ `d-m-Y h:i:s A`, no ISO 8601. `null` mientras el piloto no confirme. */
    loadedAt: z.string().nullable(),
    /** El piloto que confirmó. **No viene su id.** */
    confirmedByName: z.string().nullable(),
    /** Quien registró la carga. En la primera del viaje, quien lo tomó. */
    registeredByName: z.string(),
});

/**
 * El sobre entero del listado, y no solo su `data`: `totalGallons` viaja en la
 * **raíz**, así que aquí se parsea la respuesta completa.
 *
 * Ojo con los dos totales, que se parecen y no son lo mismo: `total` es el
 * conteo de filas que aporta el paginador y solo aparece con `limit`;
 * `totalGallons` es la **suma de galones confirmados** y viaja siempre.
 */
export const TripFuelsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(TripFuelSchema),
    /** ⚠️ Solo las cargas **confirmadas**. Cadena de dos decimales. */
    totalGallons: z.string(),
    lastPage: z.number().optional(),
});

/* ------------------------------------------------------------------ *
 * Paradas (tiempos muertos)
 * ------------------------------------------------------------------ */

/**
 * Un tramo en el que el camión estuvo quieto. **Nueve claves y ninguna más**, y
 * no las escribe nadie: nacen solas como efecto lateral del `POST` de
 * posiciones cuando un punto cae a menos de cinco metros del anterior. No hay
 * alta, ni edición, ni baja —una parada mal detectada es historial— y tampoco
 * websocket: el único modo de enterarse es volver a pedir este `GET`.
 *
 * Cuatro avisos que el tipo no puede dar por sí solo:
 *
 * - **`latitude` y `longitude` son cadenas** de ocho decimales, como en
 *   `TripPosition`. Son las coordenadas del **ancla** —el punto anterior, el
 *   primero del reposo—, no las del punto que detectó la parada.
 * - **`startedAt` y `endedAt` no son ISO 8601**: llegan en el `d-m-Y h:i:s A`
 *   del proyecto y se desarman con `parseTripMoment`.
 * - **`endedAt` en `null` es la parada abierta.** No hay `status` ni enum: el
 *   estado lo dice ese `null`, y con él `durationMinutes` también es `null`, a
 *   propósito —medirlo contra `now()` daría un valor distinto en cada lectura—.
 * - **`endPositionId` en `null` con `endedAt` puesto significa que la cerró el
 *   `/finish` del viaje**, no que el camión arrancara. Es la única forma de
 *   distinguir las dos causas de cierre: no existe ningún `closeReason`.
 *
 * No trae `tripId`: quien pide las paradas ya lo lleva en la URL.
 */
export const TripTimeoutSchema = z.object({
    /** Id de la parada. **No es parámetro de ninguna ruta**: no existe `/timeouts/{timeout}`. */
    id: z.number(),
    /** ⚠️ Cadena de ocho decimales, no número. La latitud del ancla. */
    latitude: z.string(),
    longitude: z.string(),
    /** El `recordedAt` del ancla. Nunca `null`. Formato `d-m-Y h:i:s A`. */
    startedAt: z.string(),
    /** ⚠️ `null` = parada abierta: el camión seguía quieto en su último punto. */
    endedAt: z.string().nullable(),
    /**
     * Minutos con hasta dos decimales, calculados en lectura. **`null` mientras
     * la parada siga abierta.** Un valor exacto llega **sin** decimales (`1`,
     * no `1.0`), así que es número y no una cadena ya formateada.
     */
    durationMinutes: z.number().nullable(),
    /** Quién conducía al abrirse la parada. **No viene el nombre**: se cruza con el detalle. */
    pilotId: z.number(),
    /** El `trip_position` que ancla la parada. Nunca `null`. */
    startPositionId: z.number(),
    /** `null` con `endedAt` puesto = la cerró el fin del viaje. */
    endPositionId: z.number().nullable(),
});
