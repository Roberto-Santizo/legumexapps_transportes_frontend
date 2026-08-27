import type { Client, ClientDatasource, ClientFilters, ClientForm, PaginatedClients } from "@/features/clients/clients";
import { ClientRepository } from "@/features/clients/clients";

export class ClientRepositoryImpl extends ClientRepository {
    constructor(private datasource: ClientDatasource) {
        super();
    }

    createClient(payload: ClientForm): Promise<string> {
        return this.datasource.createClient(payload);
    }

    getClients(limit: string, page: string, filters?: ClientFilters): Promise<PaginatedClients> {
        return this.datasource.getClients(limit, page, filters);
    }

    getClientById(id: string): Promise<Client> {
        return this.datasource.getClientById(id);
    }

    updateClientById(id: string, payload: ClientForm): Promise<string> {
        return this.datasource.updateClientById(id, payload);
    }

    deleteClientById(id: string): Promise<string> {
        return this.datasource.deleteClientById(id);
    }
}
