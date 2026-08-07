import type { FuelPrice, FuelPriceForm, PaginatedFuelPrices } from "@/features/fuel-prices/fuel-prices";

export abstract class FuelPriceDatasource {
    abstract createFuelPrice(payload: FuelPriceForm): Promise<string>;
    abstract getFuelPrices(limit: string, page: string): Promise<PaginatedFuelPrices>;
    abstract getFuelPriceById(id: string): Promise<FuelPrice>;
    abstract updateFuelPriceById(id: string, payload: FuelPriceForm): Promise<string>;
    abstract deleteFuelPriceById(id: string): Promise<string>;
}
