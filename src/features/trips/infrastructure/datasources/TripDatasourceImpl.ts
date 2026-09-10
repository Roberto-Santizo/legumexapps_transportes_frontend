import type { PaginatedTrips, Trip, TripAssignmentForm, TripFilters, TripForm, TripFuelForm, TripFuels, TripPosition, TripTimeout, TripUpdateForm } from "@/features/trips/trips";
import { PaginatedTripsSchema, TripDatasource, TripFuelsSchema, TripPositionSchema, TripSchema, TripTimeoutSchema, buildTripQuery, getTripErrorMessage } from "@/features/trips/trips";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";
import { z } from "zod";

export class TripDatasourceImpl extends TripDatasource {
    constructor(private api: AxiosInstance, private url = '/trips') {
        super();
    }

    /**
     * Doce campos y los doce obligatorios. Otros cinco —`status`, `pilotId`,
     * `vehicleId`, `assignedBy` y `registeredBy`— se descartan sin error: el
     * viaje nace `pending`, sin tripulación, y el autor sale del token.
     *
     * `polyline` la resuelve la pantalla con `GET /api/places/directions`
     * **antes** de llamar aquí: la API no habla con Google y no calcula nada.
     */
    async createTrip(payload: TripForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Lo que devuelve depende del rol, y eso no se ve en el contrato: el
     * administrador y el `manager` leen todos los viajes; el `carrier`, la
     * bolsa más lo que tomó **su empresa**; el `pilot`, solo los suyos —la
     * bolsa no le aparece—.
     *
     * El ámbito se aplica **antes** que los filtros: ninguna combinación de
     * query params revela un viaje que ya tomó otra empresa. Orden fijo por
     * `recolectionDate` descendente y no hay `sortBy`.
     *
     * Sin `limit` la API responde la colección completa **sin metadatos**, así
     * que `total` y `currentPage` son opcionales en el esquema.
     */
    async getTrips(limit: string, page: string, filters?: TripFilters): Promise<PaginatedTrips> {
        try {
            const { data } = await this.api.get(`${this.url}?${buildTripQuery(limit, page, filters)}`);
            const response = PaginatedTripsSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Fuera de ámbito responde **403, no 404**: el viaje existe y la API no lo
     * niega, simplemente no es tuyo. El 404 queda para el id inexistente y para
     * el borrado, que desde aquí son indistinguibles.
     */
    async getTripById(id: string): Promise<Trip> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = TripSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Todos los campos son opcionales y un cuerpo vacío responde 200 sin tocar
     * nada, pero opcional **no** es vaciable: una clave en `null` o en blanco
     * es 422.
     *
     * Dos avisos que la respuesta no da:
     *
     * - `pilotId` y `vehicleId` se **ignoran en silencio**. Un 200 aquí no
     *   prueba que se haya asignado nada; para eso está `/assignment`.
     * - Los catálogos se revalidan siempre, aunque solo se mueva una fecha: si
     *   el puerto se desactivó desde el alta, esto responde 400.
     */
    async updateTripById(id: string, payload: TripUpdateForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Baja lógica **irreversible**: el viaje desaparece del listado y del
     * detalle, no hay `/restore` y no existe ningún parámetro que devuelva los
     * borrados. Tampoco es idempotente —un segundo `DELETE` responde 400—.
     *
     * Es la única respuesta del dominio donde `deletedAt` trae valor.
     */
    async deleteTripById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * El acto que le da dueño al viaje: la empresa que asigna es la que se lo
     * queda. Solo `carrier`, y con empresa registrada.
     *
     * Los dos campos son obligatorios y `null` en cualquiera es 422: **la
     * desasignación no existe** y el viaje no vuelve nunca a la bolsa. Se puede
     * reasignar mientras siga `pending` y solo desde la empresa que ya lo tomó.
     *
     * La escritura corre en transacción con bloqueo de fila: si dos empresas
     * pulsan a la vez, una gana y la otra recibe 403.
     */
    async assignTripById(id: string, payload: TripAssignmentForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}/assignment`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Sin cuerpo: `startDate` la pone el `now()` del **servidor** y mandar una
     * fecha no la usa. Deja el viaje `in_route`.
     *
     * El rol `pilot` abre la puerta, pero dentro el service comprueba que seas
     * **el piloto asignado**. Ojo al orden de las guardas: primero mira si el
     * viaje está borrado y después si eres su piloto, así que un piloto ajeno
     * sobre un viaje borrado recibe 400, no 403.
     */
    async startTripById(id: string): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}/start`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Sin cuerpo. Deja `endDate` con la hora del servidor y el viaje
     * `finished`. Responde 400 si el viaje no tiene `startDate`: no se cierra
     * uno que nunca arrancó.
     */
    async finishTripById(id: string): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}/finish`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * El recorrido **real** del viaje, que no es la `polyline`: esa es la ruta
     * prevista y no se recalcula nunca. Aquí están los puntos que fue
     * reportando el piloto.
     *
     * Cuatro particularidades frente al resto del dominio:
     *
     * - **Se pide sin `limit`**, así que llega el rastro entero y sin
     *   metadatos de paginación. Un viaje de seis horas al ritmo del piso de
     *   quince segundos deja unas mil cuatrocientas filas.
     * - **El orden es `recordedAt` ascendente**, al revés que todos los demás
     *   listados: el primer elemento es el principio del viaje, que es
     *   justamente como se dibuja una línea.
     * - **Un rastro vacío no es un error.** Un viaje que acaba de arrancar
     *   responde 200 con `data: []`, nunca 404.
     * - **Todo `pilot` recibe 403**, incluido el piloto asignado a este viaje:
     *   su aplicación ya sabe dónde está. Fuera de ámbito también es 403 y no
     *   404, igual que en el detalle.
     */
    async getTripPositions(id: string): Promise<TripPosition[]> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}/positions`);
            const response = z.array(TripPositionSchema).safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Las cargas del viaje, y **el sobre entero**: `totalGallons` viaja en la
     * raíz junto a `statusCode` y `message`, no dentro de `data`. De ahí que
     * aquí se parsee `data` completo y no `data['data']` como en el resto del
     * dominio.
     *
     * Cuatro particularidades:
     *
     * - **Se pide sin `limit`**, así que llegan todas las cargas y sin
     *   metadatos de paginación. Un viaje tiene un puñado de cargas, no mil
     *   puntos como el rastro.
     * - **Lo leen los cuatro roles**, incluido el piloto asignado —al revés que
     *   `/positions`, que a todo piloto le responde 403—: el dato es sobre él.
     * - **`totalGallons` solo suma lo confirmado.** Un viaje recién tomado
     *   responde `"0.00"` teniendo ya una carga: no es un error.
     * - **Un viaje sin cargas no es un error**: 200 con `data: []`.
     *
     * El viaje borrado responde **404** aquí y **400** en el alta: para quien
     * lee, un viaje borrado simplemente no está.
     */
    async getTripFuels(id: string): Promise<TripFuels> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}/fuels`);
            const response = TripFuelsSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Registrar una carga: lo que la empresa le entrega al viaje. Solo
     * `carrier`, y solo si **su empresa tomó el viaje** —la comparación va
     * sobre la empresa de quien asignó, no sobre la persona, así que cualquier
     * usuario de esa empresa puede cargar—. Sobre la bolsa libre responde 403
     * aunque el listado sí se pueda leer: una carga sin piloto que la confirme
     * nacería atascada.
     *
     * Se acepta en `pending` y en `in_route` —una recarga en carretera es el
     * caso real— y nunca en `finished`. El `status` del viaje no se toca.
     *
     * **Es irreversible y no se serializa**: no hay `PATCH` ni `DELETE` de una
     * carga, los galones no admiten negativos —así que un error no se compensa
     * ni con otra carga— y dos pulsaciones seguidas crean **dos filas**, porque
     * dos camionadas iguales son legítimas. Por eso la pantalla confirma la
     * cantidad antes de llamar aquí.
     */
    async createTripFuel(id: string, payload: TripFuelForm): Promise<string> {
        try {
            const { data } = await this.api.post(`${this.url}/${id}/fuels`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Las paradas del viaje: los tramos en que el camión estuvo quieto. **Es el
     * único endpoint del dominio que no se escribe desde ninguna parte**: las
     * paradas nacen solas cuando el piloto reporta un punto a menos de cinco
     * metros del anterior, así que no hay alta, ni edición, ni baja, y una
     * parada mal detectada se queda como historial.
     *
     * Cuatro particularidades:
     *
     * - **Se pide sin `limit`**, así que llegan todas y sin metadatos de
     *   paginación, como el rastro. Y como el rastro, puede ser mucho: no hay
     *   umbral mínimo de duración, así que un recorrido urbano deja decenas de
     *   filas de quince segundos —los semáforos—. Filtrar ese ruido por
     *   `durationMinutes` es cosa de la pantalla.
     * - **El orden es `startedAt` ascendente**, con desempate por `id`: la
     *   primera parada del viaje va primero, igual que en `/positions` y al
     *   revés que el resto de listados.
     * - **Todo `pilot` recibe 403**, incluido el asignado a este viaje, igual
     *   que en el rastro. Fuera de ámbito también es 403 y no 404.
     * - **Un viaje sin paradas no es un error**: 200 con `data: []`. Y ese
     *   vacío tiene tres lecturas indistinguibles —no paró, no reportó
     *   posiciones, o es anterior a la spec y no hubo backfill—.
     *
     * No admite ningún filtro: cualquier query param que no sea `limit` o
     * `page` se ignora en silencio con 200, nunca 422. Este endpoint **no tiene
     * 422**.
     */
    async getTripTimeouts(id: string): Promise<TripTimeout[]> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}/timeouts`);
            const response = z.array(TripTimeoutSchema).safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
