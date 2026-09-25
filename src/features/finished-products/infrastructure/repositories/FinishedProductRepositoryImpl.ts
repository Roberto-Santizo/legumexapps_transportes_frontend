import type { FinishedProduct, FinishedProductDatasource, FinishedProductFilters, FinishedProductPayload, FinishedProductUpdatePayload, PaginatedFinishedProducts } from "@/features/finished-products/finished-products";
import { FinishedProductRepository } from "@/features/finished-products/finished-products";

export class FinishedProductRepositoryImpl extends FinishedProductRepository {
    constructor(private datasource: FinishedProductDatasource) {
        super();
    }

    createFinishedProduct(payload: FinishedProductPayload): Promise<string> {
        return this.datasource.createFinishedProduct(payload);
    }

    getFinishedProducts(limit: string, page: string, filters?: FinishedProductFilters): Promise<PaginatedFinishedProducts> {
        return this.datasource.getFinishedProducts(limit, page, filters);
    }

    getFinishedProductById(id: string): Promise<FinishedProduct> {
        return this.datasource.getFinishedProductById(id);
    }

    updateFinishedProductById(id: string, payload: FinishedProductUpdatePayload): Promise<string> {
        return this.datasource.updateFinishedProductById(id, payload);
    }

    deleteFinishedProductById(id: string): Promise<string> {
        return this.datasource.deleteFinishedProductById(id);
    }
}
