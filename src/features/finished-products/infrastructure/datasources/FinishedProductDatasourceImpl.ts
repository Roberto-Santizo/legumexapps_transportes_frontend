import type { FinishedProduct, FinishedProductFilters, FinishedProductPayload, FinishedProductUpdatePayload, PaginatedFinishedProducts } from "@/features/finished-products/finished-products";
import { FinishedProductDatasource, FinishedProductSchema, PaginatedFinishedProductsSchema, buildFinishedProductQuery, getFinishedProductErrorMessage } from "@/features/finished-products/finished-products";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class FinishedProductDatasourceImpl extends FinishedProductDatasource {
    constructor(private api: AxiosInstance, private url = '/finished-products') {
        super();
    }

    /**
     * El `code` ocupado —por un SKU vivo **o borrado**— y el cliente borrado
     * responden 400 en `message`, no 422 en `errors`.
     */
    async createFinishedProduct(payload: FinishedProductPayload): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Orden fijo por `id` ascendente. Los SKU borrados no salen por ninguna vía. */
    async getFinishedProducts(limit: string, page: string, filters?: FinishedProductFilters): Promise<PaginatedFinishedProducts> {
        try {
            const { data } = await this.api.get(`${this.url}?${buildFinishedProductQuery(limit, page, filters)}`);
            const response = PaginatedFinishedProductsSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Un SKU borrado responde 404, igual que un id que nunca existió. */
    async getFinishedProductById(id: string): Promise<FinishedProduct> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = FinishedProductSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * PATCH con solo los campos que cambiaron: reenviar el `clientId` de un
     * cliente borrado da 400 aunque sea el mismo que ya tenía el SKU.
     */
    async updateFinishedProductById(id: string, payload: FinishedProductUpdatePayload): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Borra de verdad y no es idempotente: el segundo `DELETE` es 400. No hay
     * forma de restaurarlo y su `code` queda ocupado para siempre.
     */
    async deleteFinishedProductById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
