import type { PaginatedPilotSalaryHistory, PaginatedPilots, PilotSalaryForm } from "@/features/pilots/pilots";
import {
    PaginatedPilotSalaryHistorySchema,
    PaginatedPilotsSchema,
    PilotDatasource,
    getPilotErrorMessage
} from "@/features/pilots/pilots";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class PilotDatasourceImpl extends PilotDatasource {
    constructor(private api: AxiosInstance, private url = '/pilots') {
        super();
    }

    /**
     * Solo aparecen usuarios que ya son pilotos de alguna empresa: la lista
     * sale de la pivote, no de la tabla de usuarios. El orden es fijo `id ASC`
     * de la fila pivote —el orden en que se fueron uniendo—, no configurable.
     *
     * `carrierId` solo surte efecto para `administrator` y `manager`; a un
     * `carrier` se le ignora en silencio y recibe 200 con sus propios pilotos.
     * Los filtros son tolerantes: ninguno produce 422 ni 404.
     */
    async getPilots(limit: string, page: string, carrierId?: string): Promise<PaginatedPilots> {
        try {
            const query = new URLSearchParams({ limit, page });

            if (carrierId) query.set('carrierId', carrierId);

            const { data } = await this.api.get(`${this.url}?${query.toString()}`);
            const response = PaginatedPilotsSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getPilotErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Única escritura del dominio. Sirve igual para la primera asignación —el
     * piloto tenía `salary: null`— que para cualquier cambio posterior, y el
     * cambio rige desde que se guarda: no hay aumentos programados ni aviso al
     * piloto. El id es el `user_id`, no el de la fila pivote.
     *
     * Mandar el salario que ya tiene responde 400 y no toca la bitácora.
     */
    async updatePilotSalaryById(id: string, payload: PilotSalaryForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}/salary`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getPilotErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Bitácora de solo lectura, del cambio más reciente al más antiguo
     * (`id DESC`, no por fecha). La última entrada de la lista es siempre la
     * primera asignación, la única con `previousSalary: null`.
     *
     * Un piloto sin ningún cambio devuelve 200 con `data: []`, nunca 404: el
     * 404 es del piloto, no del historial. La bitácora no se purga nunca, así
     * que se lee paginada.
     */
    async getPilotSalaryHistoryById(id: string, limit: string, page: string): Promise<PaginatedPilotSalaryHistory> {
        try {
            const query = new URLSearchParams({ limit, page });
            const { data } = await this.api.get(`${this.url}/${id}/salary-history?${query.toString()}`);
            const response = PaginatedPilotSalaryHistorySchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getPilotErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
