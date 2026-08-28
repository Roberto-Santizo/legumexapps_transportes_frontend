import type { PackingListSummary } from "@/features/packing-lists/packing-lists";
import { PackingListDatasource, PackingListSummarySchema } from "@/features/packing-lists/packing-lists";
import { isAxiosError, type AxiosInstance } from "axios";

/**
 * Lectura sobre el backend de packing lists. Dos cosas lo separan del resto de
 * datasources del proyecto:
 *
 * - **El sobre es `response`, no `data`.** Es otra API, con otro contrato.
 * - **El 404 se traduce a `null`.** Que la orden no esté en ningún packing list
 *   es un resultado, no un fallo: quien decide qué hacer con eso es la pantalla.
 */
export class PackingListDatasourceImpl extends PackingListDatasource {
    constructor(private api: AxiosInstance, private url = '/ctpat/summary') {
        super();
    }

    /** La orden va en la ruta y suele llevar espacios: se codifica siempre. */
    async getSummaryByOrder(order: string): Promise<PackingListSummary | null> {
        try {
            const { data } = await this.api.get(`${this.url}/${encodeURIComponent(order)}`);
            const response = PackingListSummarySchema.safeParse(data['response']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) {
                if (error.response?.status === 404) return null;

                throw new Error(
                    error.response?.data?.message ?? "No se pudo obtener el resumen del packing list",
                    { cause: error }
                );
            }

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
