import type { PaginatedZones, Zone, ZoneDatasource, ZoneForm } from "@/features/zones/zones";
import { ZoneRepository } from "@/features/zones/zones";

export class ZoneRepositoryImpl extends ZoneRepository {
    constructor(private datasource: ZoneDatasource) {
        super();
    }

    createZone(payload: ZoneForm): Promise<string> {
        return this.datasource.createZone(payload);
    }

    getZones(limit: string, page: string): Promise<PaginatedZones> {
        return this.datasource.getZones(limit, page);
    }

    getZoneById(id: string): Promise<Zone> {
        return this.datasource.getZoneById(id);
    }

    updateZoneById(id: string, payload: ZoneForm): Promise<string> {
        return this.datasource.updateZoneById(id, payload);
    }

    toggleZoneStatusById(id: string): Promise<string> {
        return this.datasource.toggleZoneStatusById(id);
    }

    deleteZoneById(id: string): Promise<string> {
        return this.datasource.deleteZoneById(id);
    }
}
