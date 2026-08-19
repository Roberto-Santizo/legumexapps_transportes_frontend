import type { PlaceRepository } from "@/features/places/places";
import { PlaceDatasourceImpl, PlaceRepositoryImpl } from "@/features/places/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class PlaceProvider {
    constructor(private repository: PlaceRepository) { }

    searchPlaces(search: string) {
        return this.repository.searchPlaces(search);
    }

    getPlaceById(placeId: string) {
        return this.repository.getPlaceById(placeId);
    }
}

const datasource = new PlaceDatasourceImpl(api);
const repository = new PlaceRepositoryImpl(datasource);
export const placeProvider = new PlaceProvider(repository);
