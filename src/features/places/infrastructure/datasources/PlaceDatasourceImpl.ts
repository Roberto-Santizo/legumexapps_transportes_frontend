import type { Place, PlacePrediction } from "@/features/places/places";
import { PlaceDatasource, PlacePredictionSchema, PlaceSchema } from "@/features/places/places";
import { isAxiosError, type AxiosInstance } from "axios";
import { z } from "zod";

/**
 * Proxy de lectura sobre Google Places. No persiste nada y no guarda caché: los
 * términos de Google prohíben almacenar el lugar más de 30 días.
 */
export class PlaceDatasourceImpl extends PlaceDatasource {
    constructor(private api: AxiosInstance, private url = '/places') {
        super();
    }

    /** Devuelve hasta 10 coincidencias. Sin resultados es un arreglo vacío, nunca `null`. */
    async searchPlaces(search: string): Promise<PlacePrediction[]> {
        try {
            const { data } = await this.api.get(`${this.url}?search=${encodeURIComponent(search)}`);
            const response = z.array(PlacePredictionSchema).safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** `placeId` es la cadena opaca de Google (`ChIJ...`). Si no existe, la API responde 404. */
    async getPlaceById(placeId: string): Promise<Place> {
        try {
            const { data } = await this.api.get(`${this.url}/${encodeURIComponent(placeId)}`);
            const response = PlaceSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(error.response?.data.message, { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
