import type {
    AccessoryCharacteristic,
    AccessoryCharacteristicForm
} from "@/features/accessory-characteristics/accessory-characteristics";
import {
    AccessoryCharacteristicDatasource,
    AccessoryCharacteristicListSchema,
    AccessoryCharacteristicSchema,
    buildAccessoryCharacteristicPayload,
    getAccessoryCharacteristicErrorMessage
} from "@/features/accessory-characteristics/accessory-characteristics";
import { ApiResponseSchema } from "@/features/shared/shared";
import type { AxiosInstance } from "axios";

export class AccessoryCharacteristicDatasourceImpl extends AccessoryCharacteristicDatasource {
    constructor(private api: AxiosInstance, private url = '/accessory-characteristics') {
        super();
    }

    /**
     * Alta de una sola característica: no hay alta en lote ni transacción que
     * agrupe varias, así que tres características son tres llamadas y si la
     * tercera falla las dos primeras quedan creadas.
     *
     * El nombre repetido **dentro del mismo accesorio** sale como 400, no como
     * 422: no hay regla `unique` en la validación y el choque lo detecta el
     * servicio. El mismo nombre en otro accesorio responde 201.
     */
    async createAccessoryCharacteristic(accessoryId: string, payload: AccessoryCharacteristicForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, buildAccessoryCharacteristicPayload(payload, accessoryId));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryCharacteristicErrorMessage(error), { cause: error });
        }
    }

    /**
     * `accessoryId` es obligatorio y viaja en **camelCase**, al revés que el
     * cuerpo del alta: sin él la API responde 422, no una lista vacía ni el
     * inventario entero.
     *
     * Se pide sin `limit` a propósito —así no pagina y devuelve todo—: un
     * accesorio tiene un puñado de características y partirlas en páginas
     * costaría más llamadas de las que ahorra. El orden es fijo por `id`
     * ascendente, el de captura, y no es configurable.
     *
     * El estado del accesorio no importa: uno `inactive` o `under_repair` lista
     * sus características igual que uno `active`.
     */
    async getAccessoryCharacteristics(accessoryId: string): Promise<AccessoryCharacteristic[]> {
        try {
            const { data } = await this.api.get(`${this.url}?accessoryId=${accessoryId}`);
            const response = AccessoryCharacteristicListSchema.safeParse(data);

            if (response.success) {
                return response.data.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryCharacteristicErrorMessage(error), { cause: error });
        }
    }

    async getAccessoryCharacteristicById(id: string): Promise<AccessoryCharacteristic> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = AccessoryCharacteristicSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryCharacteristicErrorMessage(error), { cause: error });
        }
    }

    /**
     * Actualización **parcial**: los dos campos son independientes y un cuerpo
     * vacío es un no-op válido que responde 200. El `accessory_id` no viaja
     * —el backend lo ignoraría en silencio, sin avisar de que la característica
     * no se movió— y `registered_by` sigue apuntando a quien la capturó aunque
     * la edite otro administrador.
     */
    async updateAccessoryCharacteristicById(id: string, payload: AccessoryCharacteristicForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, buildAccessoryCharacteristicPayload(payload));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryCharacteristicErrorMessage(error), { cause: error });
        }
    }

    /**
     * Borrado real: la fila desaparece de la tabla, no hay baja lógica ni
     * papelera y un segundo intento con el mismo id responde 404. Libera el
     * nombre dentro del accesorio, así que se puede volver a crear igual.
     */
    async deleteAccessoryCharacteristicById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryCharacteristicErrorMessage(error), { cause: error });
        }
    }
}
