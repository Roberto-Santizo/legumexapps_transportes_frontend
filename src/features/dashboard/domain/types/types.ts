import type {
    DashboardCurrentTripSchema,
    DashboardVehicleSchema,
    DashboardVehiclesSchema,
    ExpensesByCategorySchema,
    ExpensesByMonthSchema,
    TripInRouteSchema,
    TripOpenTimeoutSchema,
    TripsByMonthSchema,
    TripsSummarySchema,
    VehicleExpensesSummarySchema
} from "@/features/dashboard/dashboard";
import type { z } from "zod";

export type TripsSummary = z.infer<typeof TripsSummarySchema>;
export type TripsByMonth = z.infer<typeof TripsByMonthSchema>;
export type TripInRoute = z.infer<typeof TripInRouteSchema>;
export type TripOpenTimeout = z.infer<typeof TripOpenTimeoutSchema>;
export type VehicleExpensesSummary = z.infer<typeof VehicleExpensesSummarySchema>;
export type ExpensesByCategory = z.infer<typeof ExpensesByCategorySchema>;
export type ExpensesByMonth = z.infer<typeof ExpensesByMonthSchema>;
export type DashboardVehicle = z.infer<typeof DashboardVehicleSchema>;
export type DashboardVehicleStatus = DashboardVehicle["status"];
export type DashboardCurrentTrip = z.infer<typeof DashboardCurrentTripSchema>;
export type DashboardVehicles = z.infer<typeof DashboardVehiclesSchema>;

/**
 * Ningún filtro del tablero se valida en el servidor: un valor inválido se
 * **ignora en silencio** y la respuesta es la de «sin ese filtro», nunca 422.
 * Por eso se validan aquí antes de mandarlos.
 */
export type DashboardSummaryFilters = {
    /** Entero positivo que exista en `carriers`. En viajes acota por la empresa de `assigned_by`; en gastos y flota por `vehicles.carrier_id`. */
    carrierId?: number | string;
    /** `Y-m-d` estricto, inclusivo y por día completo. Sin fechas, **todo el histórico**. */
    dateFrom?: string;
    dateTo?: string;
}

/** `/trips/in-route` solo admite `carrierId`: `dateFrom`/`dateTo` se ignoran aunque se manden. */
export type DashboardInRouteFilters = Pick<DashboardSummaryFilters, "carrierId">;

/** `/vehicles` no tiene fecha de negocio: ignora `dateFrom`/`dateTo` siempre. */
export type DashboardVehicleFilters = {
    carrierId?: number | string;
    status?: string;
    condition?: string;
    /** Se aplica **antes** de paginar: `total` refleja el recorte. */
    inRoute?: boolean;
    /** Numérico activa la paginación, acotado a `[10, 100]`; ausente devuelve toda la flota. */
    limit?: number | string;
    page?: number | string;
}

/** Los recortes de periodo que ofrece el tablero. La API no aplica ninguno por defecto. */
export type DashboardPeriod = "month" | "last30" | "all";

/** Un rango cerrado en `Y-m-d`, o sin extremos cuando se pide todo el histórico. */
export type DashboardDateRange = {
    dateFrom?: string;
    dateTo?: string;
}

/** Un mes del eje temporal ya rellenado: `month` como `YYYY-MM` y `label` corto para el eje. */
export type DashboardMonthPoint = {
    month: string;
    label: string;
    total: number;
    /** Solo en gastos: el importe del mes ya convertido a número. */
    amount: number;
}
