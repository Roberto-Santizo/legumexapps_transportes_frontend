import type { FuelPrice, FuelPriceDatasource, FuelPriceForm, PaginatedFuelPrices } from "@/features/fuel-prices/fuel-prices";
import { FuelPriceRepository } from "@/features/fuel-prices/fuel-prices";

export class FuelPriceRepositoryImpl extends FuelPriceRepository {
    constructor(private datasource: FuelPriceDatasource) {
        super();
    }

    createFuelPrice(payload: FuelPriceForm): Promise<string> {
        return this.datasource.createFuelPrice(payload);
    }

    getFuelPrices(limit: string, page: string): Promise<PaginatedFuelPrices> {
        return this.datasource.getFuelPrices(limit, page);
    }

    getFuelPriceById(id: string): Promise<FuelPrice> {
        return this.datasource.getFuelPriceById(id);
    }

    updateFuelPriceById(id: string, payload: FuelPriceForm): Promise<string> {
        return this.datasource.updateFuelPriceById(id, payload);
    }

    deleteFuelPriceById(id: string): Promise<string> {
        return this.datasource.deleteFuelPriceById(id);
    }
}
