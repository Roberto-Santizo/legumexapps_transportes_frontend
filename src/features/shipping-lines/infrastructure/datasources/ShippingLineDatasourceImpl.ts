import type { PaginatedShippingLines, ShippingLine, ShippingLineFilters, ShippingLineForm } from "@/features/shipping-lines/shipping-lines";
import { PaginatedShippingLinesSchema, ShippingLineDatasource, ShippingLineSchema, buildShippingLineQuery, getShippingLineErrorMessage } from "@/features/shipping-lines/shipping-lines";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class ShippingLineDatasourceImpl extends ShippingLineDatasource {
    constructor(private api: AxiosInstance, private url = '/shipping-lines') {
        super();
    }

    /**
     * `registeredBy` no se manda: sale del usuario autenticado y enviarlo en el
     * cuerpo no cambia el autor. Un `name` ocupado —por una naviera viva **o por
     * una borrada**— responde 400, no 422, y como la normalización ocurre antes
     * de comparar, `"maersk line"` choca con `"MAERSK LINE"`.
     */
    async createShippingLine(payload: ShippingLineForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getShippingLineErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Orden fijo por `id` ascendente: no hay `sortBy` ni `sortDir`. El `search`
     * barre el nombre, es insensible a mayúsculas y a espacios de sobra y es
     * tolerante —nunca da 422—, así que un término sin coincidencias devuelve
     * 200 con la lista vacía.
     *
     * Las navieras borradas no salen aquí por ninguna vía, y el `total` tampoco
     * las cuenta. El backend acota el `limit` a `[10, 100]`.
     */
    async getShippingLines(limit: string, page: string, filters?: ShippingLineFilters): Promise<PaginatedShippingLines> {
        try {
            const { data } = await this.api.get(`${this.url}?${buildShippingLineQuery(limit, page, filters)}`);
            const response = PaginatedShippingLinesSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getShippingLineErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Una naviera borrada responde **404**, con el mismo mensaje que un id que
     * nunca existió: desde aquí los dos casos son indistinguibles, y es
     * deliberado —para quien lee, una naviera borrada no existe—.
     */
    async getShippingLineById(id: string): Promise<ShippingLine> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = ShippingLineSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getShippingLineErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * PATCH y no PUT: el único campo es opcional y un cuerpo vacío es un no-op
     * con 200 que ni siquiera mueve `updatedAt`. La unicidad ignora la propia
     * fila, así que reenviar su mismo nombre es 200.
     *
     * Es el **único arreglo posible de una errata**, y solo mientras la naviera
     * no esté borrada: sobre una borrada responde **400** («La naviera ya fue
     * eliminada»), no 404; el 404 queda para el id que nunca existió.
     */
    async updateShippingLineById(id: string, payload: ShippingLineForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getShippingLineErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * **Este sí borra**, al contrario que en los catálogos nacionales con
     * `status`: la fila desaparece del listado y del detalle y no hay forma de
     * recuperarla desde la API —no existe `/restore`, ni `/toggle-status`, ni un
     * parámetro que liste las borradas—. Su nombre, que es lo único que
     * identifica a la naviera, queda ocupado para siempre.
     *
     * Tampoco es idempotente: un segundo `DELETE` responde 400 y no 200.
     */
    async deleteShippingLineById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getShippingLineErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
