import type { PaginatedVehicles, Vehicle, VehicleForm } from "@/features/vehicles/vehicles";
import { buildVehicleFormData, PaginatedVehiclesSchema, VehicleDatasource, VehicleSchema } from "@/features/vehicles/vehicles";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class VehicleDatasourceImpl extends VehicleDatasource {
    constructor(private api: AxiosInstance, private url = '/vehicles') {
        super();
    }

    async createVehicle(payload: VehicleForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, buildVehicleFormData(payload));
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

    async getVehicles(limit: string, page: string): Promise<PaginatedVehicles> {
        try {
            const { data } = await this.api.get(`${this.url}?limit=${limit}&page=${page}`);
            const response = PaginatedVehiclesSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getVehicleById(id: string): Promise<Vehicle> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = VehicleSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async updateVehicleById(id: string, payload: VehicleForm): Promise<string> {
        try {
            const { data } = await this.api.put(`${this.url}/${id}`, buildVehicleFormData(payload));
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

    async deleteVehicleById(id: string): Promise<string> {
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
