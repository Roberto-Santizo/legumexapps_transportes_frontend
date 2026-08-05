import type { Carrier, CarrierDatasource, CarrierForm, PaginatedCarriers } from "@/features/carriers/carriers";
import { CarrierRepository } from "@/features/carriers/carriers";

export class CarrierRepositoryImpl extends CarrierRepository {
    constructor(private datasource: CarrierDatasource) {
        super();
    }

    createCarrier(payload: CarrierForm): Promise<string> {
        return this.datasource.createCarrier(payload);
    }

    getCarriers(limit: string, page: string): Promise<PaginatedCarriers> {
        return this.datasource.getCarriers(limit, page);
    }

    getCarrierById(id: string): Promise<Carrier> {
        return this.datasource.getCarrierById(id);
    }

    updateCarrierById(id: string, payload: CarrierForm): Promise<string> {
        return this.datasource.updateCarrierById(id, payload);
    }

    deleteCarrierById(id: string): Promise<string> {
        return this.datasource.deleteCarrierById(id);
    }
}
