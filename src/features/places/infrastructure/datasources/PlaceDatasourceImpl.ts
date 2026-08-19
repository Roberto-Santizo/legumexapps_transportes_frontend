import type { Directions, DirectionsQuery, Place, PlacePrediction } from "@/features/places/places";
import { DirectionsError, DirectionsSchema, PlaceDatasource, PlacePredictionSchema, PlaceSchema } from "@/features/places/places";
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

    /**
     * La ruta por carretera desde un par de coordenadas sueltas hasta un destino
     * de `locations`. Los tres parámetros son obligatorios y no tienen defaults.
     *
     * Su `catch` no es el de los otros dos métodos: es el único endpoint que
     * puede responder 400, y su 422 llega en el formato de Laravel
     * (`{ message, errors }`), sin el sobre `{ statusCode, message, data }`.
     */
    async getDirections({ locationId, latitude, longitude }: DirectionsQuery): Promise<Directions> {
        try {
            const { data } = await this.api.get(`${this.url}/directions?locationId=${locationId}&lat=${latitude}&lng=${longitude}`);
            const response = DirectionsSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) {
                const body = error.response?.data;
                const fieldMessages = Object.values(body?.errors ?? {}).flat().join(' · ');

                throw new DirectionsError(
                    fieldMessages || body?.message || "No se pudo calcular la ruta.",
                    error.response?.status ?? 0,
                );
            }

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
