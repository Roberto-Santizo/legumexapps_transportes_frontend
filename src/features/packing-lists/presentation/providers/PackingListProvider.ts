import type { PackingListRepository } from "@/features/packing-lists/packing-lists";
import { PackingListDatasourceImpl, PackingListRepositoryImpl } from "@/features/packing-lists/infrastructure/infrastructure";
import packingListApi from "@/config/http/packingListApi";

export class PackingListProvider {
    constructor(private repository: PackingListRepository) { }

    getSummaryByOrder(order: string) {
        return this.repository.getSummaryByOrder(order);
    }
}

const datasource = new PackingListDatasourceImpl(packingListApi);
const repository = new PackingListRepositoryImpl(datasource);
export const packingListProvider = new PackingListProvider(repository);
