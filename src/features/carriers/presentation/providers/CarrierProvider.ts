import type { CarrierForm, CarrierRepository } from "@/features/carriers/carriers";
import { CarrierDatasourceImpl, CarrierRepositoryImpl } from "@/features/carriers/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class CarrierProvider {
    constructor(private repository: CarrierRepository) { }

    createCarrier(payload: CarrierForm) {
        return this.repository.createCarrier(payload);
    }

    getCarriers(limit: string, page: string) {
        return this.repository.getCarriers(limit, page);
    }

    getCarrierById(id: string) {
        return this.repository.getCarrierById(id);
    }

    updateCarrierById(id: string, payload: CarrierForm) {
        return this.repository.updateCarrierById(id, payload);
    }

    deleteCarrierById(id: string) {
        return this.repository.deleteCarrierById(id);
    }
}

const datasource = new CarrierDatasourceImpl(api);
const repository = new CarrierRepositoryImpl(datasource);
export const carrierProvider = new CarrierProvider(repository);
