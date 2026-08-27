import type { PaginatedShippingLines, ShippingLine, ShippingLineDatasource, ShippingLineFilters, ShippingLineForm } from "@/features/shipping-lines/shipping-lines";
import { ShippingLineRepository } from "@/features/shipping-lines/shipping-lines";

export class ShippingLineRepositoryImpl extends ShippingLineRepository {
    constructor(private datasource: ShippingLineDatasource) {
        super();
    }

    createShippingLine(payload: ShippingLineForm): Promise<string> {
        return this.datasource.createShippingLine(payload);
    }

    getShippingLines(limit: string, page: string, filters?: ShippingLineFilters): Promise<PaginatedShippingLines> {
        return this.datasource.getShippingLines(limit, page, filters);
    }

    getShippingLineById(id: string): Promise<ShippingLine> {
        return this.datasource.getShippingLineById(id);
    }

    updateShippingLineById(id: string, payload: ShippingLineForm): Promise<string> {
        return this.datasource.updateShippingLineById(id, payload);
    }

    deleteShippingLineById(id: string): Promise<string> {
        return this.datasource.deleteShippingLineById(id);
    }
}
