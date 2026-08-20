import type {
    AccessoryCharacteristicForm,
    AccessoryCharacteristicRepository
} from "@/features/accessory-characteristics/accessory-characteristics";
import {
    AccessoryCharacteristicDatasourceImpl,
    AccessoryCharacteristicRepositoryImpl
} from "@/features/accessory-characteristics/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class AccessoryCharacteristicProvider {
    constructor(private repository: AccessoryCharacteristicRepository) { }

    createAccessoryCharacteristic(accessoryId: string, payload: AccessoryCharacteristicForm) {
        return this.repository.createAccessoryCharacteristic(accessoryId, payload);
    }

    getAccessoryCharacteristics(accessoryId: string) {
        return this.repository.getAccessoryCharacteristics(accessoryId);
    }

    getAccessoryCharacteristicById(id: string) {
        return this.repository.getAccessoryCharacteristicById(id);
    }

    updateAccessoryCharacteristicById(id: string, payload: AccessoryCharacteristicForm) {
        return this.repository.updateAccessoryCharacteristicById(id, payload);
    }

    deleteAccessoryCharacteristicById(id: string) {
        return this.repository.deleteAccessoryCharacteristicById(id);
    }
}

const datasource = new AccessoryCharacteristicDatasourceImpl(api);
const repository = new AccessoryCharacteristicRepositoryImpl(datasource);
export const accessoryCharacteristicProvider = new AccessoryCharacteristicProvider(repository);
