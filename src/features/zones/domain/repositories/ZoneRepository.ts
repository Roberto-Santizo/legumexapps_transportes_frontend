import type { PaginatedZones, Zone, ZoneForm } from "@/features/zones/zones";

export abstract class ZoneRepository {
    abstract createZone(payload: ZoneForm): Promise<string>;
    abstract getZones(limit: string, page: string): Promise<PaginatedZones>;
    abstract getZoneById(id: string): Promise<Zone>;
    abstract updateZoneById(id: string, payload: ZoneForm): Promise<string>;
    abstract toggleZoneStatusById(id: string): Promise<string>;
    abstract deleteZoneById(id: string): Promise<string>;
}
