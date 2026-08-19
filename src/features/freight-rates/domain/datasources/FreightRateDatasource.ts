import type { FreightQuote, FreightQuoteForm, FreightRate, FreightRateForm } from "@/features/freight-rates/freight-rates";

export abstract class FreightRateDatasource {
    abstract createFreightRate(payload: FreightRateForm): Promise<string>;
    /** Sin paginación. `locationId` es el único filtro que existe. */
    abstract getFreightRates(locationId?: string): Promise<FreightRate[]>;
    abstract getFreightRateById(id: string): Promise<FreightRate>;
    abstract updateFreightRateById(id: string, payload: FreightRateForm): Promise<string>;
    abstract deleteFreightRateById(id: string): Promise<string>;
    /** Consulta pura: no reserva, no fija el precio y no crea ninguna fila. */
    abstract getFreightQuote(payload: FreightQuoteForm): Promise<FreightQuote>;
}
