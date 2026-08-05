import type { Carrier, CarrierForm, PaginatedCarriers } from "@/features/carriers/carriers";

export abstract class CarrierRepository {
    abstract createCarrier(payload: CarrierForm): Promise<string>;
    abstract getCarriers(limit: string, page: string): Promise<PaginatedCarriers>;
    abstract getCarrierById(id: string): Promise<Carrier>;
    abstract updateCarrierById(id: string, payload: CarrierForm): Promise<string>;
    abstract deleteCarrierById(id: string): Promise<string>;
}
