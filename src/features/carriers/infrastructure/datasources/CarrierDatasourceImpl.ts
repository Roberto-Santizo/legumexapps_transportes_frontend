import type { Carrier, CarrierForm, PaginatedCarriers } from "@/features/carriers/carriers";
import { buildCarrierFormData, CarrierDatasource, CarrierSchema, PaginatedCarriersSchema } from "@/features/carriers/carriers";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class CarrierDatasourceImpl extends CarrierDatasource {
    constructor(private api: AxiosInstance, private url = '/carriers') {
        super();
    }

    async createCarrier(payload: CarrierForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, buildCarrierFormData(payload));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getCarriers(limit: string, page: string): Promise<PaginatedCarriers> {
        try {
            const { data } = await this.api.get(`${this.url}?limit=${limit}&page=${page}`);
            const response = PaginatedCarriersSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getCarrierById(id: string): Promise<Carrier> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = CarrierSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async updateCarrierById(id: string, payload: CarrierForm): Promise<string> {
        try {
            const { data } = await this.api.put(`${this.url}/${id}`, buildCarrierFormData(payload));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async deleteCarrierById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
