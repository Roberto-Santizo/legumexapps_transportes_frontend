import type { VehicleForm, VehicleRepository } from "@/features/vehicles/vehicles";
import { VehicleDatasourceImpl, VehicleRepositoryImpl } from "@/features/vehicles/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class VehicleProvider {
    constructor(private repository: VehicleRepository) { }

    createVehicle(payload: VehicleForm) {
        return this.repository.createVehicle(payload);
    }

    getVehicles(limit: string, page: string) {
        return this.repository.getVehicles(limit, page);
    }

    getVehicleById(id: string) {
        return this.repository.getVehicleById(id);
    }

    updateVehicleById(id: string, payload: VehicleForm) {
        return this.repository.updateVehicleById(id, payload);
    }

    deleteVehicleById(id: string) {
        return this.repository.deleteVehicleById(id);
    }
}

const datasource = new VehicleDatasourceImpl(api);
const repository = new VehicleRepositoryImpl(datasource);
export const vehicleProvider = new VehicleProvider(repository);
