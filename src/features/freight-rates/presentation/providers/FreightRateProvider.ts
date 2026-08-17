import type { FreightQuoteForm, FreightRateForm, FreightRateRepository } from "@/features/freight-rates/freight-rates";
import { FreightRateDatasourceImpl, FreightRateRepositoryImpl } from "@/features/freight-rates/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class FreightRateProvider {
    constructor(private repository: FreightRateRepository) { }

    createFreightRate(payload: FreightRateForm) {
        return this.repository.createFreightRate(payload);
    }

    getFreightRates(zoneId?: string) {
        return this.repository.getFreightRates(zoneId);
    }

    getFreightRateById(id: string) {
        return this.repository.getFreightRateById(id);
    }

    updateFreightRateById(id: string, payload: FreightRateForm) {
        return this.repository.updateFreightRateById(id, payload);
    }

    deleteFreightRateById(id: string) {
        return this.repository.deleteFreightRateById(id);
    }

    getFreightQuote(payload: FreightQuoteForm) {
        return this.repository.getFreightQuote(payload);
    }
}

const datasource = new FreightRateDatasourceImpl(api);
const repository = new FreightRateRepositoryImpl(datasource);
export const freightRateProvider = new FreightRateProvider(repository);
