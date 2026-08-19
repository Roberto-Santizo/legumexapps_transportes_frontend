import type { LocationForm, LocationRepository } from "@/features/locations/locations";
import { LocationDatasourceImpl, LocationRepositoryImpl } from "@/features/locations/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class LocationProvider {
    constructor(private repository: LocationRepository) { }

    createLocation(payload: LocationForm) {
        return this.repository.createLocation(payload);
    }

    getLocations(limit: string, page: string) {
        return this.repository.getLocations(limit, page);
    }

    getLocationById(id: string) {
        return this.repository.getLocationById(id);
    }

    updateLocationById(id: string, payload: LocationForm) {
        return this.repository.updateLocationById(id, payload);
    }

    toggleLocationStatusById(id: string) {
        return this.repository.toggleLocationStatusById(id);
    }

    deleteLocationById(id: string) {
        return this.repository.deleteLocationById(id);
    }
}

const datasource = new LocationDatasourceImpl(api);
const repository = new LocationRepositoryImpl(datasource);
export const locationProvider = new LocationProvider(repository);
