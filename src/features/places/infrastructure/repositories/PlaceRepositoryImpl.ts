import type { Directions, DirectionsQuery, Place, PlaceDatasource, PlacePrediction } from "@/features/places/places";
import { PlaceRepository } from "@/features/places/places";

export class PlaceRepositoryImpl extends PlaceRepository {
    constructor(private datasource: PlaceDatasource) {
        super();
    }

    searchPlaces(search: string): Promise<PlacePrediction[]> {
        return this.datasource.searchPlaces(search);
    }

    getPlaceById(placeId: string): Promise<Place> {
        return this.datasource.getPlaceById(placeId);
    }

    getDirections(query: DirectionsQuery): Promise<Directions> {
        return this.datasource.getDirections(query);
    }
}
