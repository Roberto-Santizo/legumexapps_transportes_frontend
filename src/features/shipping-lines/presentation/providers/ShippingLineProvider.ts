import type { ShippingLineFilters, ShippingLineForm, ShippingLineRepository } from "@/features/shipping-lines/shipping-lines";
import { ShippingLineDatasourceImpl, ShippingLineRepositoryImpl } from "@/features/shipping-lines/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class ShippingLineProvider {
    constructor(private repository: ShippingLineRepository) { }

    createShippingLine(payload: ShippingLineForm) {
        return this.repository.createShippingLine(payload);
    }

    getShippingLines(limit: string, page: string, filters?: ShippingLineFilters) {
        return this.repository.getShippingLines(limit, page, filters);
    }

    getShippingLineById(id: string) {
        return this.repository.getShippingLineById(id);
    }

    updateShippingLineById(id: string, payload: ShippingLineForm) {
        return this.repository.updateShippingLineById(id, payload);
    }

    deleteShippingLineById(id: string) {
        return this.repository.deleteShippingLineById(id);
    }
}

const datasource = new ShippingLineDatasourceImpl(api);
const repository = new ShippingLineRepositoryImpl(datasource);
export const shippingLineProvider = new ShippingLineProvider(repository);
