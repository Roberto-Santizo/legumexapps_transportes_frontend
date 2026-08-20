import type { Accessory, AccessoryFilters, AccessoryForm, PaginatedAccessories } from "@/features/accessories/accessories";

export abstract class AccessoryRepository {
    abstract createAccessory(payload: AccessoryForm): Promise<string>;
    abstract getAccessories(limit: string, page: string, filters?: AccessoryFilters): Promise<PaginatedAccessories>;
    abstract getAccessoryById(id: string): Promise<Accessory>;
    abstract updateAccessoryById(id: string, payload: AccessoryForm): Promise<string>;
    abstract deleteAccessoryById(id: string): Promise<string>;
}
