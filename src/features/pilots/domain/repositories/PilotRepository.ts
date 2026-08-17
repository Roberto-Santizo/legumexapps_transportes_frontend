import type { PaginatedPilotSalaryHistory, PaginatedPilots, PilotSalaryForm } from "@/features/pilots/pilots";

export abstract class PilotRepository {
    abstract getPilots(limit: string, page: string, carrierId?: string): Promise<PaginatedPilots>;
    abstract updatePilotSalaryById(id: string, payload: PilotSalaryForm): Promise<string>;
    abstract getPilotSalaryHistoryById(id: string, limit: string, page: string): Promise<PaginatedPilotSalaryHistory>;
}
