import type { PaginatedTrips, Trip, TripAssignmentForm, TripFilters, TripForm, TripUpdateForm } from "@/features/trips/trips";
import { PaginatedTripsSchema, TripDatasource, TripSchema, buildTripQuery, getTripErrorMessage } from "@/features/trips/trips";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

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
}
