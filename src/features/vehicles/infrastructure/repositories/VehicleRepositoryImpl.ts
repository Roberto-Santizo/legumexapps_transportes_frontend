import type { PaginatedVehicles, Vehicle, VehicleDatasource, VehicleForm } from "@/features/vehicles/vehicles";
import { VehicleRepository } from "@/features/vehicles/vehicles";

export class VehicleRepositoryImpl extends VehicleRepository {
    constructor(private datasource: VehicleDatasource) {
        super();
    }

    createVehicle(payload: VehicleForm): Promise<string> {
        return this.datasource.createVehicle(payload);
    }

    getVehicles(limit: string, page: string): Promise<PaginatedVehicles> {
        return this.datasource.getVehicles(limit, page);
    }

    getVehicleById(id: string): Promise<Vehicle> {
        return this.datasource.getVehicleById(id);
    }

    updateVehicleById(id: string, payload: VehicleForm): Promise<string> {
        return this.datasource.updateVehicleById(id, payload);
    }

    deleteVehicleById(id: string): Promise<string> {
        return this.datasource.deleteVehicleById(id);
    }
}
