import type { DeparturePointForm, DeparturePointRepository } from "@/features/departure-points/departure-points";
import { DeparturePointDatasourceImpl, DeparturePointRepositoryImpl } from "@/features/departure-points/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class DeparturePointProvider {
    constructor(private repository: DeparturePointRepository) { }

    createDeparturePoint(payload: DeparturePointForm) {
        return this.repository.createDeparturePoint(payload);
    }

    getDeparturePoints(limit: string, page: string) {
        return this.repository.getDeparturePoints(limit, page);
    }

    getDeparturePointById(id: string) {
        return this.repository.getDeparturePointById(id);
    }

    updateDeparturePointById(id: string, payload: DeparturePointForm) {
        return this.repository.updateDeparturePointById(id, payload);
    }

    toggleDeparturePointStatusById(id: string) {
        return this.repository.toggleDeparturePointStatusById(id);
    }

    deleteDeparturePointById(id: string) {
        return this.repository.deleteDeparturePointById(id);
    }
}

const datasource = new DeparturePointDatasourceImpl(api);
const repository = new DeparturePointRepositoryImpl(datasource);
export const departurePointProvider = new DeparturePointProvider(repository);
