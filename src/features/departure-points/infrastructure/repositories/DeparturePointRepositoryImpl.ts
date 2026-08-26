import type { DeparturePoint, DeparturePointDatasource, DeparturePointForm, PaginatedDeparturePoints } from "@/features/departure-points/departure-points";
import { DeparturePointRepository } from "@/features/departure-points/departure-points";

export class DeparturePointRepositoryImpl extends DeparturePointRepository {
    constructor(private datasource: DeparturePointDatasource) {
        super();
    }

    createDeparturePoint(payload: DeparturePointForm): Promise<string> {
        return this.datasource.createDeparturePoint(payload);
    }

    getDeparturePoints(limit: string, page: string): Promise<PaginatedDeparturePoints> {
        return this.datasource.getDeparturePoints(limit, page);
    }

    getDeparturePointById(id: string): Promise<DeparturePoint> {
        return this.datasource.getDeparturePointById(id);
    }

    updateDeparturePointById(id: string, payload: DeparturePointForm): Promise<string> {
        return this.datasource.updateDeparturePointById(id, payload);
    }

    toggleDeparturePointStatusById(id: string): Promise<string> {
        return this.datasource.toggleDeparturePointStatusById(id);
    }

    deleteDeparturePointById(id: string): Promise<string> {
        return this.datasource.deleteDeparturePointById(id);
    }
}
