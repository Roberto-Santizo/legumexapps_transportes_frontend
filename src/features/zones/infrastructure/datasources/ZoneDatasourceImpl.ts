import type { PaginatedZones, Zone, ZoneForm } from "@/features/zones/zones";
import { PaginatedZonesSchema, ZoneDatasource, ZoneSchema, getZoneErrorMessage } from "@/features/zones/zones";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class ZoneDatasourceImpl extends ZoneDatasource {
    constructor(private api: AxiosInstance, private url = '/zones') {
        super();
    }

    async createZone(payload: ZoneForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getZoneErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getZones(limit: string, page: string): Promise<PaginatedZones> {
        try {
            const { data } = await this.api.get(`${this.url}?limit=${limit}&page=${page}`);
            const response = PaginatedZonesSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getZoneErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getZoneById(id: string): Promise<Zone> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = ZoneSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getZoneErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * PATCH y no PUT: la edición es parcial y `area`, si viaja, sustituye el
     * polígono entero —no hay edición de vértices sueltos—.
     */
    async updateZoneById(id: string, payload: ZoneForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getZoneErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Invierte el estado. No lleva body y no es idempotente: es un interruptor. */
    async toggleZoneStatusById(id: string): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}/toggle-status`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getZoneErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Baja lógica: pone `status: false`. La zona sigue existiendo y se puede reactivar. */
    async deleteZoneById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getZoneErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
