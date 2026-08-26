import type { DeparturePoint, DeparturePointForm, PaginatedDeparturePoints } from "@/features/departure-points/departure-points";

export abstract class DeparturePointDatasource {
    abstract createDeparturePoint(payload: DeparturePointForm): Promise<string>;
    abstract getDeparturePoints(limit: string, page: string): Promise<PaginatedDeparturePoints>;
    abstract getDeparturePointById(id: string): Promise<DeparturePoint>;
    abstract updateDeparturePointById(id: string, payload: DeparturePointForm): Promise<string>;
    abstract toggleDeparturePointStatusById(id: string): Promise<string>;
    abstract deleteDeparturePointById(id: string): Promise<string>;
}
