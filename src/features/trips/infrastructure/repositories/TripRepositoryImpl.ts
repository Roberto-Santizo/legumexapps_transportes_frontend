import type { PaginatedTrips, Trip, TripAssignmentForm, TripDatasource, TripFilters, TripForm, TripFuelForm, TripFuels, TripPosition, TripTimeout, TripUpdateForm } from "@/features/trips/trips";
import { TripRepository } from "@/features/trips/trips";

export class TripRepositoryImpl extends TripRepository {
    constructor(private datasource: TripDatasource) {
        super();
    }

    createTrip(payload: TripForm): Promise<string> {
        return this.datasource.createTrip(payload);
    }

    getTrips(limit: string, page: string, filters?: TripFilters): Promise<PaginatedTrips> {
        return this.datasource.getTrips(limit, page, filters);
    }

    getTripById(id: string): Promise<Trip> {
        return this.datasource.getTripById(id);
    }

    updateTripById(id: string, payload: TripUpdateForm): Promise<string> {
        return this.datasource.updateTripById(id, payload);
    }

    deleteTripById(id: string): Promise<string> {
        return this.datasource.deleteTripById(id);
    }

    assignTripById(id: string, payload: TripAssignmentForm): Promise<string> {
        return this.datasource.assignTripById(id, payload);
    }

    startTripById(id: string): Promise<string> {
        return this.datasource.startTripById(id);
    }

    finishTripById(id: string): Promise<string> {
        return this.datasource.finishTripById(id);
    }

    getTripPositions(id: string): Promise<TripPosition[]> {
        return this.datasource.getTripPositions(id);
    }

    getTripFuels(id: string): Promise<TripFuels> {
        return this.datasource.getTripFuels(id);
    }

    createTripFuel(id: string, payload: TripFuelForm): Promise<string> {
        return this.datasource.createTripFuel(id, payload);
    }

    getTripTimeouts(id: string): Promise<TripTimeout[]> {
        return this.datasource.getTripTimeouts(id);
    }
}
