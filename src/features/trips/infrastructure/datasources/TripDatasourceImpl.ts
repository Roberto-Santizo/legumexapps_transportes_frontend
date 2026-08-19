import type { TripForm } from "@/features/trips/trips";
import { TRIP_NOT_IMPLEMENTED, TripDatasource } from "@/features/trips/trips";
import type { AxiosInstance } from "axios";

/**
 * El backend todavía no publica `/trips`: los cinco métodos existen, están
 * tipados y lanzan. Cuando el recurso exista, esta spec no cambia firmas, solo
 * rellena cuerpos.
 *
 * `api` y `url` son `readonly` públicas y no privadas a propósito:
 * `noUnusedLocals` marca como error una propiedad privada que nadie lee, y
 * mientras los cinco métodos lancen, nadie las lee.
 */
export class TripDatasourceImpl extends TripDatasource {
    constructor(readonly api: AxiosInstance, readonly url = '/trips') {
        super();
    }

    async createTrip(_payload: TripForm): Promise<string> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }

    async getTrips(_limit: string, _page: string): Promise<unknown> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }

    async getTripById(_id: string): Promise<unknown> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }

    async updateTripById(_id: string, _payload: TripForm): Promise<string> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }

    async deleteTripById(_id: string): Promise<string> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }
}
