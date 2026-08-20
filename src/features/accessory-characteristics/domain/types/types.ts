import type { AccessoryCharacteristicSchema } from "@/features/accessory-characteristics/accessory-characteristics";
import type { z } from "zod";

export type AccessoryCharacteristic = z.infer<typeof AccessoryCharacteristicSchema>;

/**
 * Lo que se captura: dos campos y ninguno para el accesorio. En el alta lo pone
 * el panel donde se registra la característica y en la edición es **inmutable**
 * —el backend ignora un `accessory_id` en el PATCH sin dar error—, así que
 * mover una característica de accesorio es borrarla y volverla a crear.
 */
export type AccessoryCharacteristicForm = {
    /** Se guarda en MAYÚSCULAS y con los espacios colapsados, lo teclee como lo teclee. */
    name: string;
    /** Texto libre: conserva su capitalización y solo se le recortan los extremos. */
    value: string;
}
