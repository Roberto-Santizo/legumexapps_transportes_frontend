import type { TripFinishedProductPayload, TripFinishedProductRepository, TripFinishedProductUpdatePayload } from "@/features/trip-finished-products/trip-finished-products";
import { TripFinishedProductDatasourceImpl, TripFinishedProductRepositoryImpl } from "@/features/trip-finished-products/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class TripFinishedProductProvider {
    constructor(private repository: TripFinishedProductRepository) { }

    getTripFinishedProducts(tripId: string) {
        return this.repository.getTripFinishedProducts(tripId);
    }

    createTripFinishedProduct(payload: TripFinishedProductPayload) {
        return this.repository.createTripFinishedProduct(payload);
    }

    updateTripFinishedProductById(id: string, payload: TripFinishedProductUpdatePayload) {
        return this.repository.updateTripFinishedProductById(id, payload);
    }

    deleteTripFinishedProductById(id: string) {
        return this.repository.deleteTripFinishedProductById(id);
    }
}

const datasource = new TripFinishedProductDatasourceImpl(api);
const repository = new TripFinishedProductRepositoryImpl(datasource);
export const tripFinishedProductProvider = new TripFinishedProductProvider(repository);
