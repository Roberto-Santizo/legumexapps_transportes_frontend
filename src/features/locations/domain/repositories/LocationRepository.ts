import type { Location, LocationForm, PaginatedLocations } from "@/features/locations/locations";

export abstract class LocationRepository {
    abstract createLocation(payload: LocationForm): Promise<string>;
    abstract getLocations(limit: string, page: string): Promise<PaginatedLocations>;
    abstract getLocationById(id: string): Promise<Location>;
    abstract updateLocationById(id: string, payload: LocationForm): Promise<string>;
    abstract toggleLocationStatusById(id: string): Promise<string>;
    abstract deleteLocationById(id: string): Promise<string>;
}
