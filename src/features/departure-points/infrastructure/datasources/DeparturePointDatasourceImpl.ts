import type { DeparturePoint, DeparturePointForm, PaginatedDeparturePoints } from "@/features/departure-points/departure-points";
import { DeparturePointDatasource, DeparturePointSchema, PaginatedDeparturePointsSchema, getDeparturePointErrorMessage } from "@/features/departure-points/departure-points";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class DeparturePointDatasourceImpl extends DeparturePointDatasource {
    constructor(private api: AxiosInstance, private url = '/departure-points') {
        super();
    }

    /** El punto de partida nace activo: mandar status en el alta no se respeta. */
    async createDeparturePoint(payload: DeparturePointForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDeparturePointErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getDeparturePoints(limit: string, page: string): Promise<PaginatedDeparturePoints> {
        try {
            const { data } = await this.api.get(`${this.url}?limit=${limit}&page=${page}`);
            const response = PaginatedDeparturePointsSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDeparturePointErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    async getDeparturePointById(id: string): Promise<DeparturePoint> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = DeparturePointSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDeparturePointErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * PATCH y no PUT: la edición es parcial. Reapuntar el googlePlaceId a otro
     * lugar conserva el id del punto de partida.
     */
    async updateDeparturePointById(id: string, payload: DeparturePointForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDeparturePointErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Invierte el estado. No lleva body y no es idempotente: es un interruptor. */
    async toggleDeparturePointStatusById(id: string): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}/toggle-status`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDeparturePointErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Baja lógica idempotente: pone status en false. La fila no se borra. */
    async deleteDeparturePointById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDeparturePointErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
