import type { PaginatedVehicles, Vehicle, VehicleFilters, VehicleForm } from "@/features/vehicles/vehicles";

export abstract class VehicleDatasource {
    abstract createVehicle(payload: VehicleForm): Promise<string>;
    abstract getVehicles(limit: string, page: string, filters?: VehicleFilters): Promise<PaginatedVehicles>;
    abstract getVehicleById(id: string): Promise<Vehicle>;
    abstract updateVehicleById(id: string, payload: VehicleForm): Promise<string>;
    abstract deleteVehicleById(id: string): Promise<string>;
}
