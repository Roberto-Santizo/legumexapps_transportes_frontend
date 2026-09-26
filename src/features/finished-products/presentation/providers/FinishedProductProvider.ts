import type { FinishedProductFilters, FinishedProductPayload, FinishedProductRepository, FinishedProductUpdatePayload } from "@/features/finished-products/finished-products";
import { FinishedProductDatasourceImpl, FinishedProductRepositoryImpl } from "@/features/finished-products/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class FinishedProductProvider {
    constructor(private repository: FinishedProductRepository) { }

    createFinishedProduct(payload: FinishedProductPayload) {
        return this.repository.createFinishedProduct(payload);
    }

    getFinishedProducts(limit: string, page: string, filters?: FinishedProductFilters) {
        return this.repository.getFinishedProducts(limit, page, filters);
    }

    getFinishedProductById(id: string) {
        return this.repository.getFinishedProductById(id);
    }

    updateFinishedProductById(id: string, payload: FinishedProductUpdatePayload) {
        return this.repository.updateFinishedProductById(id, payload);
    }

    deleteFinishedProductById(id: string) {
        return this.repository.deleteFinishedProductById(id);
    }
}

const datasource = new FinishedProductDatasourceImpl(api);
const repository = new FinishedProductRepositoryImpl(datasource);
export const finishedProductProvider = new FinishedProductProvider(repository);
