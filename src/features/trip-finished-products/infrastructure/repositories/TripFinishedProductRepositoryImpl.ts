import type { TripFinishedProduct, TripFinishedProductDatasource, TripFinishedProductPayload, TripFinishedProductUpdatePayload } from "@/features/trip-finished-products/trip-finished-products";
import { TripFinishedProductRepository } from "@/features/trip-finished-products/trip-finished-products";

export class TripFinishedProductRepositoryImpl extends TripFinishedProductRepository {
    constructor(private datasource: TripFinishedProductDatasource) {
        super();
    }

    getTripFinishedProducts(tripId: string): Promise<TripFinishedProduct[]> {
        return this.datasource.getTripFinishedProducts(tripId);
    }

    createTripFinishedProduct(payload: TripFinishedProductPayload): Promise<string> {
        return this.datasource.createTripFinishedProduct(payload);
    }

    updateTripFinishedProductById(id: string, payload: TripFinishedProductUpdatePayload): Promise<string> {
        return this.datasource.updateTripFinishedProductById(id, payload);
    }

    deleteTripFinishedProductById(id: string): Promise<string> {
        return this.datasource.deleteTripFinishedProductById(id);
    }
}
