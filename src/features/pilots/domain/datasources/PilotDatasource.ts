import type { PaginatedPilotSalaryHistory, PaginatedPilots, PilotSalaryForm } from "@/features/pilots/pilots";

/**
 * Tres endpoints y ninguno más: no hay alta, detalle, edición ni baja. Vincular
 * un piloto a una empresa es `POST /api/carriers/join`, y desvincularlo no
 * existe en ninguna parte de la API.
 */
export abstract class PilotDatasource {
    abstract getPilots(limit: string, page: string, carrierId?: string): Promise<PaginatedPilots>;
    abstract updatePilotSalaryById(id: string, payload: PilotSalaryForm): Promise<string>;
    abstract getPilotSalaryHistoryById(id: string, limit: string, page: string): Promise<PaginatedPilotSalaryHistory>;
}
