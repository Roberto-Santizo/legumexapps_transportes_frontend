import type { Client, ClientFilters, ClientForm, PaginatedClients } from "@/features/clients/clients";

export abstract class ClientDatasource {
    abstract createClient(payload: ClientForm): Promise<string>;
    abstract getClients(limit: string, page: string, filters?: ClientFilters): Promise<PaginatedClients>;
    abstract getClientById(id: string): Promise<Client>;
    abstract updateClientById(id: string, payload: ClientForm): Promise<string>;
    abstract deleteClientById(id: string): Promise<string>;
}
