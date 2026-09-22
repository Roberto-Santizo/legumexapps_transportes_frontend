import type { PaginatedTrips, Trip, TripAssignmentForm, TripCost, TripExpenseForm, TripExpenses, TripFilters, TripForm, TripFuelForm, TripFuels, TripPosition, TripTimeout, TripUpdateForm } from "@/features/trips/trips";

/**
 * Los quince endpoints del dominio. Los nueve últimos no son un CRUD: son las
 * acciones que mueven el viaje entre manos —la empresa lo toma, le carga
 * combustible y le entrega viáticos, el piloto lo arranca y lo cierra— y las
 * lecturas que deja ese recorrido —el rastro, las cargas, los viáticos y las
 * paradas, y el costo directo del viaje cerrado—, cada una con su propio rol.
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
    abstract getTripFuels(id: string): Promise<TripFuels>;
    abstract createTripFuel(id: string, payload: TripFuelForm): Promise<string>;
    abstract getTripExpenses(id: string): Promise<TripExpenses>;
    abstract createTripExpense(id: string, payload: TripExpenseForm): Promise<string>;
    abstract getTripTimeouts(id: string): Promise<TripTimeout[]>;
    abstract getTripCost(id: string): Promise<TripCost>;
}
