import type { TripFinishedProduct, TripFinishedProductPayload, TripFinishedProductUpdatePayload } from "@/features/trip-finished-products/trip-finished-products";
import { TripFinishedProductDatasource, TripFinishedProductsSchema, getTripFinishedProductErrorMessage } from "@/features/trip-finished-products/trip-finished-products";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

/**
 * Las rutas **no van anidadas bajo el viaje**: el viaje va en el query param
 * `tripId` del listado y en el body del alta.
 */
export class TripFinishedProductDatasourceImpl extends TripFinishedProductDatasource {
    constructor(private api: AxiosInstance, private url = '/trip-finished-products') {
        super();
    }

    /** Nunca pagina. Un viaje anterior a SPEC 37 responde `[]` con 200: no es un error. */
    async getTripFinishedProducts(tripId: string): Promise<TripFinishedProduct[]> {
        try {
            const { data } = await this.api.get(`${this.url}?${new URLSearchParams({ tripId })}`);
            const response = TripFinishedProductsSchema.safeParse(data);

            if (response.success) {
                return response.data.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Cinco guardas de negocio con 400, y solo con el viaje en `pending`. */
    async createTripFinishedProduct(payload: TripFinishedProductPayload): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Solo `{ boxes }`: el cuerpo vacío es 422, no un no-op. */
    async updateTripFinishedProductById(id: string, payload: TripFinishedProductUpdatePayload): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Borrado físico, sin restauración. Borrar la última línea es 400. */
    async deleteTripFinishedProductById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getTripFinishedProductErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
