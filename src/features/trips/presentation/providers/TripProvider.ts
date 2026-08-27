import type { TripAssignmentForm, TripFilters, TripForm, TripRepository, TripUpdateForm } from "@/features/trips/trips";
import { TripDatasourceImpl, TripRepositoryImpl } from "@/features/trips/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class TripProvider {
    constructor(private repository: TripRepository) { }

    createTrip(payload: TripForm) {
        return this.repository.createTrip(payload);
    }

    getTrips(limit: string, page: string, filters?: TripFilters) {
        return this.repository.getTrips(limit, page, filters);
    }

    getTripById(id: string) {
        return this.repository.getTripById(id);
    }

    updateTripById(id: string, payload: TripUpdateForm) {
        return this.repository.updateTripById(id, payload);
    }

    deleteTripById(id: string) {
        return this.repository.deleteTripById(id);
    }

    assignTripById(id: string, payload: TripAssignmentForm) {
        return this.repository.assignTripById(id, payload);
    }

    startTripById(id: string) {
        return this.repository.startTripById(id);
    }

    finishTripById(id: string) {
        return this.repository.finishTripById(id);
    }
}

const datasource = new TripDatasourceImpl(api);
const repository = new TripRepositoryImpl(datasource);
export const tripProvider = new TripProvider(repository);
