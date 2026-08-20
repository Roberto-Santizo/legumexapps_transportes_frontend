import type { TripDatasource, TripForm } from "@/features/trips/trips";
import { TripRepository } from "@/features/trips/trips";

export class TripRepositoryImpl extends TripRepository {
    constructor(private datasource: TripDatasource) {
        super();
    }

    createTrip(payload: TripForm): Promise<string> {
        return this.datasource.createTrip(payload);
    }

    getTrips(limit: string, page: string): Promise<unknown> {
        return this.datasource.getTrips(limit, page);
    }

    getTripById(id: string): Promise<unknown> {
        return this.datasource.getTripById(id);
    }

    updateTripById(id: string, payload: TripForm): Promise<string> {
        return this.datasource.updateTripById(id, payload);
    }

    deleteTripById(id: string): Promise<string> {
        return this.datasource.deleteTripById(id);
    }
}
