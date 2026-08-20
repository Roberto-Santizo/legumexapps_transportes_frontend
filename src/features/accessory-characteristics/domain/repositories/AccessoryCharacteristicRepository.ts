import type {
    AccessoryCharacteristic,
    AccessoryCharacteristicForm
} from "@/features/accessory-characteristics/accessory-characteristics";

export abstract class AccessoryCharacteristicRepository {
    abstract createAccessoryCharacteristic(accessoryId: string, payload: AccessoryCharacteristicForm): Promise<string>;
    abstract getAccessoryCharacteristics(accessoryId: string): Promise<AccessoryCharacteristic[]>;
    abstract getAccessoryCharacteristicById(id: string): Promise<AccessoryCharacteristic>;
    abstract updateAccessoryCharacteristicById(id: string, payload: AccessoryCharacteristicForm): Promise<string>;
    abstract deleteAccessoryCharacteristicById(id: string): Promise<string>;
}
