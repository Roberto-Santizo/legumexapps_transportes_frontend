import type { FuelPriceForm, FuelPriceRepository } from "@/features/fuel-prices/fuel-prices";
import { FuelPriceDatasourceImpl, FuelPriceRepositoryImpl } from "@/features/fuel-prices/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class FuelPriceProvider {
    constructor(private repository: FuelPriceRepository) { }

    createFuelPrice(payload: FuelPriceForm) {
        return this.repository.createFuelPrice(payload);
    }

    getFuelPrices(limit: string, page: string) {
        return this.repository.getFuelPrices(limit, page);
    }

    getFuelPriceById(id: string) {
        return this.repository.getFuelPriceById(id);
    }

    updateFuelPriceById(id: string, payload: FuelPriceForm) {
        return this.repository.updateFuelPriceById(id, payload);
    }

    deleteFuelPriceById(id: string) {
        return this.repository.deleteFuelPriceById(id);
    }
}

const datasource = new FuelPriceDatasourceImpl(api);
const repository = new FuelPriceRepositoryImpl(datasource);
export const fuelPriceProvider = new FuelPriceProvider(repository);
