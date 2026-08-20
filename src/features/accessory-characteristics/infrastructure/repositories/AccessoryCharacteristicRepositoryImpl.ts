import type {
    AccessoryCharacteristic,
    AccessoryCharacteristicDatasource,
    AccessoryCharacteristicForm
} from "@/features/accessory-characteristics/accessory-characteristics";
import { AccessoryCharacteristicRepository } from "@/features/accessory-characteristics/accessory-characteristics";

export class AccessoryCharacteristicRepositoryImpl extends AccessoryCharacteristicRepository {
    constructor(private datasource: AccessoryCharacteristicDatasource) {
        super();
    }

    createAccessoryCharacteristic(accessoryId: string, payload: AccessoryCharacteristicForm): Promise<string> {
        return this.datasource.createAccessoryCharacteristic(accessoryId, payload);
    }

    getAccessoryCharacteristics(accessoryId: string): Promise<AccessoryCharacteristic[]> {
        return this.datasource.getAccessoryCharacteristics(accessoryId);
    }

    getAccessoryCharacteristicById(id: string): Promise<AccessoryCharacteristic> {
        return this.datasource.getAccessoryCharacteristicById(id);
    }

    updateAccessoryCharacteristicById(id: string, payload: AccessoryCharacteristicForm): Promise<string> {
        return this.datasource.updateAccessoryCharacteristicById(id, payload);
    }

    deleteAccessoryCharacteristicById(id: string): Promise<string> {
        return this.datasource.deleteAccessoryCharacteristicById(id);
    }
}
