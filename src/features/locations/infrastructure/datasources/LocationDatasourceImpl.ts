import type { Location, LocationForm, PaginatedLocations } from "@/features/locations/locations";
import { LocationDatasource, LocationSchema, PaginatedLocationsSchema, getLocationErrorMessage } from "@/features/locations/locations";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class LocationDatasourceImpl extends LocationDatasource {
    constructor(private api: AxiosInstance, private url = '/locations') {
        super();
    }

    /** El destino nace activo: mandar status en el alta no se respeta. */
    async createLocation(payload: LocationForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getLocationErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getLocations(limit: string, page: string): Promise<PaginatedLocations> {
        try {
            const { data } = await this.api.get(`${this.url}?limit=${limit}&page=${page}`);
            const response = PaginatedLocationsSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getLocationErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getLocationById(id: string): Promise<Location> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = LocationSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getLocationErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * PATCH y no PUT: la edición es parcial. Reapuntar el googlePlaceId a otro
     * lugar conserva el id del destino y sus tarifas.
     */
    async updateLocationById(id: string, payload: LocationForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getLocationErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Invierte el estado. No lleva body y no es idempotente: es un interruptor. */
    async toggleLocationStatusById(id: string): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}/toggle-status`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getLocationErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Baja lógica idempotente: pone status en false. La fila no se borra. */
    async deleteLocationById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getLocationErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
