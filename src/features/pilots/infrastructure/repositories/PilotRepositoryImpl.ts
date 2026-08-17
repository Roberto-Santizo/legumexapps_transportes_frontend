import type {
    PaginatedPilotSalaryHistory,
    PaginatedPilots,
    PilotDatasource,
    PilotSalaryForm
} from "@/features/pilots/pilots";
import { PilotRepository } from "@/features/pilots/pilots";

export class PilotRepositoryImpl extends PilotRepository {
    constructor(private datasource: PilotDatasource) {
        super();
    }

    getPilots(limit: string, page: string, carrierId?: string): Promise<PaginatedPilots> {
        return this.datasource.getPilots(limit, page, carrierId);
    }

    updatePilotSalaryById(id: string, payload: PilotSalaryForm): Promise<string> {
        return this.datasource.updatePilotSalaryById(id, payload);
    }

    getPilotSalaryHistoryById(id: string, limit: string, page: string): Promise<PaginatedPilotSalaryHistory> {
        return this.datasource.getPilotSalaryHistoryById(id, limit, page);
    }
}
