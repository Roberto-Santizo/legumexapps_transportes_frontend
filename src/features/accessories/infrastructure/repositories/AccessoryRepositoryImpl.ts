import type { Accessory, AccessoryDatasource, AccessoryFilters, AccessoryForm, PaginatedAccessories } from "@/features/accessories/accessories";
import { AccessoryRepository } from "@/features/accessories/accessories";

export class AccessoryRepositoryImpl extends AccessoryRepository {
    constructor(private datasource: AccessoryDatasource) {
        super();
    }

    createAccessory(payload: AccessoryForm): Promise<string> {
        return this.datasource.createAccessory(payload);
    }

    getAccessories(limit: string, page: string, filters?: AccessoryFilters): Promise<PaginatedAccessories> {
        return this.datasource.getAccessories(limit, page, filters);
    }

    getAccessoryById(id: string): Promise<Accessory> {
        return this.datasource.getAccessoryById(id);
    }

    updateAccessoryById(id: string, payload: AccessoryForm): Promise<string> {
        return this.datasource.updateAccessoryById(id, payload);
    }

    deleteAccessoryById(id: string): Promise<string> {
        return this.datasource.deleteAccessoryById(id);
    }
}
