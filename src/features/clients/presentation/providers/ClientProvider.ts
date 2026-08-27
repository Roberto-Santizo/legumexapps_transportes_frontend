import type { ClientFilters, ClientForm, ClientRepository } from "@/features/clients/clients";
import { ClientDatasourceImpl, ClientRepositoryImpl } from "@/features/clients/infrastructure/infrastructure";
import api from "@/config/http/axios";

export class ClientProvider {
    constructor(private repository: ClientRepository) { }

    createClient(payload: ClientForm) {
        return this.repository.createClient(payload);
    }

    getClients(limit: string, page: string, filters?: ClientFilters) {
        return this.repository.getClients(limit, page, filters);
    }

    getClientById(id: string) {
        return this.repository.getClientById(id);
    }

    updateClientById(id: string, payload: ClientForm) {
        return this.repository.updateClientById(id, payload);
    }

    deleteClientById(id: string) {
        return this.repository.deleteClientById(id);
    }
}

const datasource = new ClientDatasourceImpl(api);
const repository = new ClientRepositoryImpl(datasource);
export const clientProvider = new ClientProvider(repository);
