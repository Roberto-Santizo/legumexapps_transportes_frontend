import type {
    PaginatedVehicleExpenses,
    VehicleExpense,
    VehicleExpenseFilters,
    VehicleExpenseForm
} from "@/features/vehicle-expenses/vehicle-expenses";
import {
    buildVehicleExpensePayload,
    buildVehicleExpenseQuery,
    getVehicleExpenseErrorMessage,
    PaginatedVehicleExpensesSchema,
    VehicleExpenseDatasource,
    VehicleExpenseSchema
} from "@/features/vehicle-expenses/vehicle-expenses";
import { ApiResponseSchema } from "@/features/shared/shared";
import type { AxiosInstance } from "axios";

export class VehicleExpenseDatasourceImpl extends VehicleExpenseDatasource {
    constructor(private api: AxiosInstance, private url = '/vehicle-expenses') {
        super();
    }

    /**
     * Alta con los seis campos obligatorios. El vehículo decide el ámbito: un
     * `carrier` que registra sobre una unidad de otra empresa recibe 403, y una
     * unidad inexistente es 404, no 422.
     *
     * Un vehículo `inactive` acepta gastos igual que uno `active`: el
     * mantenimiento pudo ocurrir antes de la baja.
     */
    async createVehicleExpense(vehicleId: string, payload: VehicleExpenseForm): Promise<string> {
        try {
            const { data } = await this.api.post(this.url, buildVehicleExpensePayload(payload, vehicleId));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleExpenseErrorMessage(error), { cause: error });
        }
    }

    /**
     * `vehicleId` es obligatorio: sin él la API responde 422, no el listado de
     * la flota. Este dominio existe para una sola pantalla —el detalle de una
     * unidad— y no hay listado global.
     *
     * Los filtros son tolerantes hasta el punto de ser engañosos: un valor
     * inválido no da 422 ni una lista vacía, devuelve el listado entero.
     *
     * Orden fijo por `expenseDate` descendente y, a igualdad de fecha, por `id`
     * descendente. No hay `sortBy` ni `sortDir`.
     */
    async getVehicleExpenses(
        vehicleId: string,
        limit: string,
        page: string,
        filters?: VehicleExpenseFilters
    ): Promise<PaginatedVehicleExpenses> {
        try {
            const { data } = await this.api.get(`${this.url}?${buildVehicleExpenseQuery(vehicleId, limit, page, filters)}`);
            const response = PaginatedVehicleExpensesSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleExpenseErrorMessage(error), { cause: error });
        }
    }

    async getVehicleExpenseById(id: string): Promise<VehicleExpense> {
        try {
            const { data } = await this.api.get(`${this.url}/${id}`);
            const response = VehicleExpenseSchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleExpenseErrorMessage(error), { cause: error });
        }
    }

    /**
     * Actualización **parcial**: omitir un campo lo deja intacto, pero ninguno
     * acepta `null` una vez enviado. El `vehicle_id` no viaja —el backend lo
     * ignoraría— y `registeredBy` sigue mostrando a quien creó el gasto aunque
     * lo edite un administrador.
     */
    async updateVehicleExpenseById(id: string, payload: VehicleExpenseForm): Promise<string> {
        try {
            const { data } = await this.api.patch(`${this.url}/${id}`, buildVehicleExpensePayload(payload));
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleExpenseErrorMessage(error), { cause: error });
        }
    }

    /**
     * Borrado real: la fila desaparece de la base de datos, el `totalAmount`
     * deja de incluirla y un segundo intento responde 404. No hay papelera ni
     * bitácora, así que recuperar el gasto es volver a capturar los seis campos.
     */
    async deleteVehicleExpenseById(id: string): Promise<string> {
        try {
            const { data } = await this.api.delete(`${this.url}/${id}`);
            const response = ApiResponseSchema.safeParse(data);

            if (response.success) {
                return response.data.message;
            }

            throw new Error("Información no válida");
        } catch (error) {
            throw new Error(getVehicleExpenseErrorMessage(error), { cause: error });
        }
    }
}
