import type { PaginatedTrips, Trip, TripAssignmentForm, TripFilters, TripForm, TripPosition, TripUpdateForm } from "@/features/trips/trips";

/**
 * Los ocho endpoints del dominio. Los tres últimos no son un CRUD: son las
 * acciones que mueven el viaje entre manos —la empresa lo toma, el piloto lo
 * arranca y lo cierra— y cada una la puede llamar un solo rol.
 */
export abstract class TripRepository {
    abstract createTrip(payload: TripForm): Promise<string>;
    abstract getTrips(limit: string, page: string, filters?: TripFilters): Promise<PaginatedTrips>;
    abstract getTripById(id: string): Promise<Trip>;
    abstract updateTripById(id: string, payload: TripUpdateForm): Promise<string>;
    abstract deleteTripById(id: string): Promise<string>;
    abstract assignTripById(id: string, payload: TripAssignmentForm): Promise<string>;
    abstract startTripById(id: string): Promise<string>;
    abstract finishTripById(id: string): Promise<string>;
    abstract getTripPositions(id: string): Promise<TripPosition[]>;
}
