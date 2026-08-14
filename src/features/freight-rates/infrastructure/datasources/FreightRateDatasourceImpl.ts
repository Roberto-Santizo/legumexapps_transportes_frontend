import type { FreightQuote, FreightQuoteForm, FreightRate, FreightRateForm } from "@/features/freight-rates/freight-rates";
import {
    FreightQuoteSchema,
    FreightRateDatasource,
    FreightRateSchema,
    FreightRatesSchema,
    getFreightRateErrorMessage
} from "@/features/freight-rates/freight-rates";
import { ApiResponseSchema } from "@/features/shared/shared";
import { isAxiosError, type AxiosInstance } from "axios";

export class FreightRateDatasourceImpl extends FreightRateDatasource {
    constructor(private api: AxiosInstance, private url = '/freight-rates') {
        super();
    }

    async createFreightRate(payload: FreightRateForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFreightRateErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * El listado no pagina: `data` es la tabla de precios completa. Sin
     * `zoneId` la respuesta crece con zonas × productos × combustibles ×
     * bandas, así que se filtra siempre que la vista sea la de una zona.
     */
    async getFreightRates(zoneId?: string): Promise<FreightRate[]> {
        try {
            const query = zoneId ? `?zoneId=${zoneId}` : '';
            const { data } = await this.api.get(`${this.url}${query}`);
            const response = FreightRatesSchema.safeParse(data);

            if (response.success) {
                return response.data.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFreightRateErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /** Solo `administrator`: el resto de roles cotiza con `/quote`. */
    async getFreightRateById(id: string): Promise<FreightRate> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = FreightRateSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFreightRateErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * PATCH: la edición es parcial y los cinco campos son opcionales por
     * separado. Las reglas de negocio miran el par completo, no solo lo que se
     * envía, así que mover `fuelMin` a una banda ya ocupada responde 400.
     */
    async updateFreightRateById(id: string, payload: FreightRateForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, payload);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFreightRateErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Aquí la tarifa sí desaparece del listado y deja de aplicarse. Libera su
     * `fuelMin`, así que la banda se puede volver a cotizar con un alta nueva:
     * no hay restaurar. Un segundo intento responde 400, no 200.
     */
    async deleteFreightRateById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFreightRateErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * La zona sale del punto y el precio del combustible sale del servidor:
     * mandar un precio en la query no tiene ningún efecto. Sin `pounds` la
     * respuesta llega igual, con `pounds` y `total` en `null`.
     */
    async getFreightQuote(payload: FreightQuoteForm): Promise<FreightQuote> {
        try {
            const query = new URLSearchParams({
                lat: payload.lat.toString(),
                lng: payload.lng.toString(),
                productId: payload.productId.toString(),
                fuelType: payload.fuelType
            });

            if (payload.pounds !== undefined) query.set('pounds', payload.pounds.toString());

            const { data } = await this.api.get(`${this.url}/quote?${query.toString()}`);
            const response = FreightQuoteSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getFreightRateErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
