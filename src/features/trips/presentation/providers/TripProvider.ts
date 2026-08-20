import type { TripForm, TripRepository } from "@/features/trips/trips";
import { TripDatasourceImpl, TripRepositoryImpl } from "@/features/trips/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class TripProvider {
    constructor(private repository: TripRepository) { }

    createTrip(payload: TripForm) {
        return this.repository.createTrip(payload);
    }

    getTrips(limit: string, page: string) {
        return this.repository.getTrips(limit, page);
    }

    getTripById(id: string) {
        return this.repository.getTripById(id);
    }

    updateTripById(id: string, payload: TripForm) {
        return this.repository.updateTripById(id, payload);
    }

    deleteTripById(id: string) {
        return this.repository.deleteTripById(id);
    }
}

const datasource = new TripDatasourceImpl(api);
const repository = new TripRepositoryImpl(datasource);
export const tripProvider = new TripProvider(repository);
