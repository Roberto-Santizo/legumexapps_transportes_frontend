import type { Accessory, AccessoryFilters, AccessoryForm, PaginatedAccessories } from "@/features/accessories/accessories";
import {
    AccessoryDatasource,
    AccessorySchema,
    buildAccessoryPayload,
    buildAccessoryQuery,
    getAccessoryErrorMessage,
    PaginatedAccessoriesSchema
} from "@/features/accessories/accessories";
import { ApiResponseSchema } from "@/features/shared/shared";
import type { AxiosInstance } from "axios";

export class AccessoryDatasourceImpl extends AccessoryDatasource {
    constructor(private api: AxiosInstance, private url = '/accessories') {
        super();
    }

    async createAccessory(payload: AccessoryForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, buildAccessoryPayload(payload));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryErrorMessage(error), { cause: error });
        }
    }

    async getAccessories(limit: string, page: string, filters?: AccessoryFilters): Promise<PaginatedAccessories> {
        try {
            const { data } = await this.api.get(`${this.url}?${buildAccessoryQuery(limit, page, filters)}`);
            const response = PaginatedAccessoriesSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryErrorMessage(error), { cause: error });
        }
    }

    async getAccessoryById(id: string): Promise<Accessory> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = AccessorySchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryErrorMessage(error), { cause: error });
        }
    }

    async updateAccessoryById(id: string, payload: AccessoryForm): Promise<string> {
        try {
            const { data } = await this.api.put(`${this.url}/${id}`, buildAccessoryPayload(payload));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryErrorMessage(error), { cause: error });
        }
    }

    /** No borra: deja el accesorio en `inactive` y la fila sigue en el listado. */
    async deleteAccessoryById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getAccessoryErrorMessage(error), { cause: error });
        }
    }
}
