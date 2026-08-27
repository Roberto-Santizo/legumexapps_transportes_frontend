import type { PaginatedShippingLines, ShippingLine, ShippingLineFilters, ShippingLineForm } from "@/features/shipping-lines/shipping-lines";

export abstract class ShippingLineRepository {
    abstract createShippingLine(payload: ShippingLineForm): Promise<string>;
    abstract getShippingLines(limit: string, page: string, filters?: ShippingLineFilters): Promise<PaginatedShippingLines>;
    abstract getShippingLineById(id: string): Promise<ShippingLine>;
    abstract updateShippingLineById(id: string, payload: ShippingLineForm): Promise<string>;
    abstract deleteShippingLineById(id: string): Promise<string>;
}
