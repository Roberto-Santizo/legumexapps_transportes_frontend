import type { FinishedProduct, FinishedProductFilters, FinishedProductPayload, FinishedProductUpdatePayload, PaginatedFinishedProducts } from "@/features/finished-products/finished-products";

export abstract class FinishedProductDatasource {
    abstract createFinishedProduct(payload: FinishedProductPayload): Promise<string>;
    abstract getFinishedProducts(limit: string, page: string, filters?: FinishedProductFilters): Promise<PaginatedFinishedProducts>;
    abstract getFinishedProductById(id: string): Promise<FinishedProduct>;
    abstract updateFinishedProductById(id: string, payload: FinishedProductUpdatePayload): Promise<string>;
    abstract deleteFinishedProductById(id: string): Promise<string>;
}
