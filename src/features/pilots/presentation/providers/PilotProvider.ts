import type { PilotRepository, PilotSalaryForm } from "@/features/pilots/pilots";
import { PilotDatasourceImpl, PilotRepositoryImpl } from "@/features/pilots/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class PilotProvider {
    constructor(private repository: PilotRepository) { }

    getPilots(limit: string, page: string, carrierId?: string) {
        return this.repository.getPilots(limit, page, carrierId);
    }

    updatePilotSalaryById(id: string, payload: PilotSalaryForm) {
        return this.repository.updatePilotSalaryById(id, payload);
    }

    getPilotSalaryHistoryById(id: string, limit: string, page: string) {
        return this.repository.getPilotSalaryHistoryById(id, limit, page);
    }
}

const datasource = new PilotDatasourceImpl(api);
const repository = new PilotRepositoryImpl(datasource);
export const pilotProvider = new PilotProvider(repository);
