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
 * y termina en el extranjero. **Treinta y una claves, siempre las treinta y
 * una**, en camelCase y con las relaciones planas —`clientId` + `clientName`,
 * nunca un objeto anidado—.
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
 * Los metadatos van **aplanados en la raíz** del sobre, no bajo `meta`, y solo
 * cuando se manda un `limit`: sin él la API devuelve la colección completa y no
 * manda ninguno. `lastPage` es propio de este dominio.
 */
export const PaginatedTripsSchema = ApiPaginatedResponseSchema.extend({
    data: z.array(TripSchema),
    lastPage: z.number().optional(),
});
