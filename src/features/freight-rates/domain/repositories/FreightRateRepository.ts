import type { FreightQuote, FreightQuoteForm, FreightRate, FreightRateForm } from "@/features/freight-rates/freight-rates";

export abstract class FreightRateRepository {
    abstract createFreightRate(payload: FreightRateForm): Promise<string>;
    abstract getFreightRates(locationId?: string): Promise<FreightRate[]>;
    abstract getFreightRateById(id: string): Promise<FreightRate>;
    abstract updateFreightRateById(id: string, payload: FreightRateForm): Promise<string>;
    abstract deleteFreightRateById(id: string): Promise<string>;
    abstract getFreightQuote(payload: FreightQuoteForm): Promise<FreightQuote>;
}
