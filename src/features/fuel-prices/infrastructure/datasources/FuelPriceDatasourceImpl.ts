import type { FuelPrice, FuelPriceForm, PaginatedFuelPrices } from "@/features/fuel-prices/fuel-prices";
import { FuelPriceDatasource, FuelPriceSchema, PaginatedFuelPricesSchema } from "@/features/fuel-prices/fuel-prices";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class FuelPriceDatasourceImpl extends FuelPriceDatasource {
    constructor(private api: AxiosInstance, private url = '/fuel-prices') {
        super();
    }

    async createFuelPrice(payload: FuelPriceForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
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

    async getFuelPrices(limit: string, page: string): Promise<PaginatedFuelPrices> {
        try {
            const { data } = await this.api.get(`${this.url}?limit=${limit}&page=${page}`);
            const response = PaginatedFuelPricesSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getFuelPriceById(id: string): Promise<FuelPrice> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = FuelPriceSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async updateFuelPriceById(id: string, payload: FuelPriceForm): Promise<string> {
        try {
            const { data } = await this.api.put(`${this.url}/${id}`, payload);
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

    async deleteFuelPriceById(id: string): Promise<string> {
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
