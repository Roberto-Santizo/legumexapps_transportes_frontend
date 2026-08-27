import type { Client, ClientFilters, ClientForm, PaginatedClients } from "@/features/clients/clients";
import { ClientDatasource, ClientSchema, PaginatedClientsSchema, buildClientQuery, getClientErrorMessage } from "@/features/clients/clients";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class ClientDatasourceImpl extends ClientDatasource {
    constructor(private api: AxiosInstance, private url = '/clients') {
        super();
    }

    /**
     * `registeredBy` no se manda: sale del usuario autenticado y enviarlo en el
     * cuerpo no cambia el autor. Un `code` o un `name` ocupados —por un cliente
     * vivo **o por uno borrado**— responden 400, no 422.
     */
    async createClient(payload: ClientForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getClientErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Orden fijo por `id` ascendente: no hay `sortBy` ni `sortDir`. El `search`
     * barre el código y el nombre a la vez y es tolerante —nunca da 422—, así
     * que un término sin coincidencias devuelve 200 con la lista vacía.
     *
     * Los clientes borrados no salen aquí por ninguna vía, y el `total` tampoco
     * los cuenta.
     */
    async getClients(limit: string, page: string, filters?: ClientFilters): Promise<PaginatedClients> {
        try {
            const { data } = await this.api.get(`${this.url}?${buildClientQuery(limit, page, filters)}`);
            const response = PaginatedClientsSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getClientErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Un cliente borrado responde **404**, con el mismo mensaje que un id que
     * nunca existió: desde aquí los dos casos son indistinguibles, y es
     * deliberado —para quien lee, un cliente borrado no existe—.
     */
    async getClientById(id: string): Promise<Client> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = ClientSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getClientErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * PATCH y no PUT: los dos campos son opcionales por separado y un cuerpo
     * vacío es un no-op con 200 que ni siquiera mueve `updatedAt`. La unicidad
     * ignora la propia fila, así que reenviar su mismo código es 200.
     *
     * Sobre un cliente borrado responde **400** («El cliente ya fue
     * eliminado»), no 404; el 404 queda para el id que nunca existió.
     */
    async updateClientById(id: string, payload: ClientForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getClientErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * **Este sí borra**, al contrario que en los demás catálogos nacionales: la
     * fila desaparece del listado y del detalle y no hay forma de recuperarla
     * desde la API —no existe `/restore`, ni `/toggle-status`, ni un parámetro
     * que liste los borrados—. Su código y su nombre quedan ocupados para
     * siempre.
     *
     * Tampoco es idempotente: un segundo `DELETE` responde 400 y no 200.
     */
    async deleteClientById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getClientErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
