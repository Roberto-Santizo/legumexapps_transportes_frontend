import type { Place, PlacePrediction } from "@/features/places/places";

export abstract class PlaceDatasource {
    abstract searchPlaces(search: string): Promise<PlacePrediction[]>;
    abstract getPlaceById(placeId: string): Promise<Place>;
}
