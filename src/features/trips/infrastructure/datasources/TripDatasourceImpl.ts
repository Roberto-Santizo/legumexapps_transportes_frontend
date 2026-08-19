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
 *
 * Los métodos se implementan sin parámetros por la misma razón: TypeScript
 * acepta implementar con menos parámetros que la clase abstracta, y así ningún
 * argumento queda declarado sin usar. Las firmas completas están en
 * `TripDatasource` y vuelven aquí cuando los cuerpos existan.
 */
export class TripDatasourceImpl extends TripDatasource {
    constructor(readonly api: AxiosInstance, readonly url = '/trips') {
        super();
    }

    async createTrip(): Promise<string> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }

    async getTrips(): Promise<unknown> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }

    async getTripById(): Promise<unknown> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }

    async updateTripById(): Promise<string> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }

    async deleteTripById(): Promise<string> {
        throw new Error(TRIP_NOT_IMPLEMENTED);
    }
}
