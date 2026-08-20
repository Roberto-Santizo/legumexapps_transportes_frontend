import type { AccessoryFilters, AccessoryForm, AccessoryRepository } from "@/features/accessories/accessories";
import { AccessoryDatasourceImpl, AccessoryRepositoryImpl } from "@/features/accessories/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class AccessoryProvider {
    constructor(private repository: AccessoryRepository) { }

    createAccessory(payload: AccessoryForm) {
        return this.repository.createAccessory(payload);
    }

    getAccessories(limit: string, page: string, filters?: AccessoryFilters) {
        return this.repository.getAccessories(limit, page, filters);
    }

    getAccessoryById(id: string) {
        return this.repository.getAccessoryById(id);
    }

    updateAccessoryById(id: string, payload: AccessoryForm) {
        return this.repository.updateAccessoryById(id, payload);
    }

    deleteAccessoryById(id: string) {
        return this.repository.deleteAccessoryById(id);
    }
}

const datasource = new AccessoryDatasourceImpl(api);
const repository = new AccessoryRepositoryImpl(datasource);
export const accessoryProvider = new AccessoryProvider(repository);
