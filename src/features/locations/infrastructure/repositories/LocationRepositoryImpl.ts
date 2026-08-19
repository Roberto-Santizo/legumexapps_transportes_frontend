import type { Location, LocationDatasource, LocationForm, PaginatedLocations } from "@/features/locations/locations";
import { LocationRepository } from "@/features/locations/locations";

export class LocationRepositoryImpl extends LocationRepository {
    constructor(private datasource: LocationDatasource) {
        super();
    }

    createLocation(payload: LocationForm): Promise<string> {
        return this.datasource.createLocation(payload);
    }

    getLocations(limit: string, page: string): Promise<PaginatedLocations> {
        return this.datasource.getLocations(limit, page);
    }

    getLocationById(id: string): Promise<Location> {
        return this.datasource.getLocationById(id);
    }

    updateLocationById(id: string, payload: LocationForm): Promise<string> {
        return this.datasource.updateLocationById(id, payload);
    }

    toggleLocationStatusById(id: string): Promise<string> {
        return this.datasource.toggleLocationStatusById(id);
    }

    deleteLocationById(id: string): Promise<string> {
        return this.datasource.deleteLocationById(id);
    }
}
