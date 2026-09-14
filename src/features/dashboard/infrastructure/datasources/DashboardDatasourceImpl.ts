import type { DashboardInRouteFilters, DashboardSummaryFilters, DashboardVehicleFilters, DashboardVehicles, TripInRoute, TripsSummary, VehicleExpensesSummary } from "@/features/dashboard/dashboard";
import {
    DashboardDatasource,
    DashboardVehiclesSchema,
    TripInRouteSchema,
    TripsSummarySchema,
    VehicleExpensesSummarySchema,
    buildDashboardSummaryQuery,
    buildDashboardVehiclesQuery,
    getDashboardErrorMessage,
    withQuery
} from "@/features/dashboard/dashboard";
import { isAxiosError, type AxiosInstance } from "axios";
import { z } from "zod";

/**
 * Cuatro `GET` de solo lectura bajo `/dashboard`. Sin escritura, sin `{id}`,
 * sin cuerpo y sin caché: cada llamada consulta la base en vivo. Los únicos
 * errores de negocio son 401 y 403 (`carrier` y `pilot`); cualquier otro
 * código es un 500 inesperado.
 */
export class DashboardDatasourceImpl extends DashboardDatasource {
    constructor(private api: AxiosInstance, private url = '/dashboard') {
        super();
    }

    /**
     * Sin fechas devuelve **todo el histórico**, no el mes en curso. El corte
     * es sobre `recolection_date`. Con la base vacía responde 200 con los
     * contadores a cero y los desgloses `[]`, nunca 404.
     */
    async getTripsSummary(filters?: DashboardSummaryFilters): Promise<TripsSummary> {
        try {
            const { data } = await this.api.get(withQuery(`${this.url}/trips`, buildDashboardSummaryQuery(filters)));
            const response = TripsSummarySchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDashboardErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Una foto de los viajes `in_route`, sin paginar y en orden `startDate
     * desc, tripId desc`. Solo admite `carrierId`. `stoppedMinutes` se mide
     * contra el reloj del servidor, así que la respuesta cambia en cada
     * lectura: se refresca por polling, no hay websocket del tablero.
     */
    async getTripsInRoute(filters?: DashboardInRouteFilters): Promise<TripInRoute[]> {
        try {
            const { data } = await this.api.get(withQuery(`${this.url}/trips/in-route`, buildDashboardSummaryQuery({ carrierId: filters?.carrierId })));
            const response = z.array(TripInRouteSchema).safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDashboardErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * El corte es sobre `expense_date` y `carrierId` acota por
     * `vehicles.carrier_id`: los gastos de un vehículo `inactive` cuentan
     * igual. Todo el dinero llega como cadena de dos decimales.
     */
    async getVehicleExpensesSummary(filters?: DashboardSummaryFilters): Promise<VehicleExpensesSummary> {
        try {
            const { data } = await this.api.get(withQuery(`${this.url}/vehicle-expenses`, buildDashboardSummaryQuery(filters)));
            const response = VehicleExpensesSummarySchema.safeParse(data['data']);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDashboardErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }

    /**
     * Toda la flota, incluidos `inactive` y `under_repair`, en orden `id asc`.
     * Con `limit` numérico el sobre trae `total/currentPage/lastPage` **en la
     * raíz**; sin él, `data` es la flota completa. Ignora las fechas siempre.
     */
    async getVehicles(filters?: DashboardVehicleFilters): Promise<DashboardVehicles> {
        try {
            const { data } = await this.api.get(withQuery(`${this.url}/vehicles`, buildDashboardVehiclesQuery(filters)));
            const response = DashboardVehiclesSchema.safeParse(data);

            if (response.success) {
                return response.data;
            }

            throw new Error("Información no válida");
        } catch (error) {
            if (isAxiosError(error)) throw new Error(getDashboardErrorMessage(error), { cause: error });

            throw new Error("Error no controlado.", { cause: error });
        }
    }
}
