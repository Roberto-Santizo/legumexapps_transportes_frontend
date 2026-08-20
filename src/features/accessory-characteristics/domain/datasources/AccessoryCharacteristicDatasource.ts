import type {
    AccessoryCharacteristic,
    AccessoryCharacteristicForm
} from "@/features/accessory-characteristics/accessory-characteristics";

export abstract class AccessoryCharacteristicDatasource {
    abstract createAccessoryCharacteristic(accessoryId: string, payload: AccessoryCharacteristicForm): Promise<string>;
    /** `accessoryId` es obligatorio: sin él la API responde 422, no el listado del inventario. */
    abstract getAccessoryCharacteristics(accessoryId: string): Promise<AccessoryCharacteristic[]>;
    abstract getAccessoryCharacteristicById(id: string): Promise<AccessoryCharacteristic>;
    abstract updateAccessoryCharacteristicById(id: string, payload: AccessoryCharacteristicForm): Promise<string>;
    abstract deleteAccessoryCharacteristicById(id: string): Promise<string>;
}
