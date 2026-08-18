import type { PaginatedVehicles, Vehicle, VehicleFilters, VehicleForm } from "@/features/vehicles/vehicles";
import {
    buildVehicleFormData,
    buildVehicleQuery,
    getVehicleErrorMessage,
    PaginatedVehiclesSchema,
    VehicleDatasource,
    VehicleSchema
} from "@/features/vehicles/vehicles";
import { ApiResponseSchema } from "@/features/shared/shared";
import type { AxiosInstance } from "axios";

export class VehicleDatasourceImpl extends VehicleDatasource {
    constructor(private api: AxiosInstance, private url = '/vehicles') {
        super();
    }

    /**
     * Alta `multipart/form-data` con los trece campos obligatorios. Solo la
     * puede hacer un `carrier`: un `administrator` recibe 403, y el
     * `carrier_id` sale de la empresa del usuario autenticado, no del cuerpo.
     * El `status` tampoco se envía: la unidad nace siempre `active`.
     */
    async createVehicle(payload: VehicleForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, buildVehicleFormData(payload));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleErrorMessage(error), { cause: error });
        }
    }

    /**
     * Los filtros son tolerantes: un valor inválido no produce 422 ni una
     * lista vacía, devuelve el listado entero. Por eso se validan en el
     * cliente antes de llegar aquí.
     *
     * El listado trae todos los estados, incluidos `inactive` —la baja lógica
     * no saca la fila— y `under_repair`.
     */
    async getVehicles(limit: string, page: string, filters?: VehicleFilters): Promise<PaginatedVehicles> {
        try {
            const { data } = await this.api.get(`${this.url}?${buildVehicleQuery(limit, page, filters)}`);
            const response = PaginatedVehiclesSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleErrorMessage(error), { cause: error });
        }
    }

    async getVehicleById(id: string): Promise<Vehicle> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = VehicleSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleErrorMessage(error), { cause: error });
        }
    }

    /**
     * Cuerpo parcial: omitir un campo no lo toca, enviarlo vacío es 422. El
     * `engine_number` no se puede vaciar —mandar `null` es 422, no un borrado—
     * y el `mileage` solo viaja cuando quien edita puede moverlo: si un
     * `carrier` lo manda distinto al guardado, el backend aborta el PATCH
     * entero con 403 y no guarda ningún otro campo del cuerpo.
     */
    async updateVehicleById(id: string, payload: VehicleForm): Promise<string> {
        try {
            const { data } = await this.api.put(`${this.url}/${id}`, buildVehicleFormData(payload));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleErrorMessage(error), { cause: error });
        }
    }

    /** Baja lógica: pasa el `status` a `inactive` y la fila sigue en el listado. */
    async deleteVehicleById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleErrorMessage(error), { cause: error });
        }
    }
}
