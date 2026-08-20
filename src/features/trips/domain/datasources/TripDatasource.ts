import type { TripForm } from "@/features/trips/trips";

export abstract class TripDatasource {
    abstract createTrip(payload: TripForm): Promise<string>;
    /** Sin `TripSchema` todavía: el tipo de lectura lo fija la spec del listado. */
    abstract getTrips(limit: string, page: string): Promise<unknown>;
    abstract getTripById(id: string): Promise<unknown>;
    abstract updateTripById(id: string, payload: TripForm): Promise<string>;
    abstract deleteTripById(id: string): Promise<string>;
}
