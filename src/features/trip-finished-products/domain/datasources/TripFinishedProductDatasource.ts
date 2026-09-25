import type { TripFinishedProduct, TripFinishedProductPayload, TripFinishedProductUpdatePayload } from "@/features/trip-finished-products/trip-finished-products";

export abstract class TripFinishedProductDatasource {
    abstract getTripFinishedProducts(tripId: string): Promise<TripFinishedProduct[]>;
    abstract createTripFinishedProduct(payload: TripFinishedProductPayload): Promise<string>;
    abstract updateTripFinishedProductById(id: string, payload: TripFinishedProductUpdatePayload): Promise<string>;
    abstract deleteTripFinishedProductById(id: string): Promise<string>;
}
