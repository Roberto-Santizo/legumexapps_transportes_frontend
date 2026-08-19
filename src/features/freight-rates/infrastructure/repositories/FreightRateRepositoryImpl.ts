import type { FreightQuote, FreightQuoteForm, FreightRate, FreightRateDatasource, FreightRateForm } from "@/features/freight-rates/freight-rates";
import { FreightRateRepository } from "@/features/freight-rates/freight-rates";

export class FreightRateRepositoryImpl extends FreightRateRepository {
    constructor(private datasource: FreightRateDatasource) {
        super();
    }

    createFreightRate(payload: FreightRateForm): Promise<string> {
        return this.datasource.createFreightRate(payload);
    }

    getFreightRates(locationId?: string): Promise<FreightRate[]> {
        return this.datasource.getFreightRates(locationId);
    }

    getFreightRateById(id: string): Promise<FreightRate> {
        return this.datasource.getFreightRateById(id);
    }

    updateFreightRateById(id: string, payload: FreightRateForm): Promise<string> {
        return this.datasource.updateFreightRateById(id, payload);
    }

    deleteFreightRateById(id: string): Promise<string> {
        return this.datasource.deleteFreightRateById(id);
    }

    getFreightQuote(payload: FreightQuoteForm): Promise<FreightQuote> {
        return this.datasource.getFreightQuote(payload);
    }
}
