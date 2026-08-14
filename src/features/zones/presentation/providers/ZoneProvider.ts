import type { ZoneForm, ZoneRepository } from "@/features/zones/zones";
import { ZoneDatasourceImpl, ZoneRepositoryImpl } from "@/features/zones/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class ZoneProvider {
    constructor(private repository: ZoneRepository) { }

    createZone(payload: ZoneForm) {
        return this.repository.createZone(payload);
    }

    getZones(limit: string, page: string) {
        return this.repository.getZones(limit, page);
    }

    getZoneById(id: string) {
        return this.repository.getZoneById(id);
    }

    updateZoneById(id: string, payload: ZoneForm) {
        return this.repository.updateZoneById(id, payload);
    }

    toggleZoneStatusById(id: string) {
        return this.repository.toggleZoneStatusById(id);
    }

    deleteZoneById(id: string) {
        return this.repository.deleteZoneById(id);
    }
}

const datasource = new ZoneDatasourceImpl(api);
const repository = new ZoneRepositoryImpl(datasource);
export const zoneProvider = new ZoneProvider(repository);
