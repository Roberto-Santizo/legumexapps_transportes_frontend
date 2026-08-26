import type { Location, LocationForm, LocationType, PaginatedLocations } from "@/features/locations/locations";
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

    /**
     * El filtro `type` solo se manda si es un valor del enum: la API ignora en
     * silencio cualquier otra cosa y devuelve el catálogo entero, así que un
     * valor mal escrito no vaciaría la lista, la dejaría completa.
     */
    async getLocations(limit: string, page: string, type?: LocationType): Promise<PaginatedLocations> {
        try {
            const params = new URLSearchParams({ limit, page });

            if (type) params.set('type', type);

            const { data } = await this.api.get(`${this.url}?${params.toString()}`);
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
