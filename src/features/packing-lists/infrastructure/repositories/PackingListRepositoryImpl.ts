import type { PackingListDatasource, PackingListSummary } from "@/features/packing-lists/packing-lists";
import { PackingListRepository } from "@/features/packing-lists/packing-lists";

export class PackingListRepositoryImpl extends PackingListRepository {
    constructor(private datasource: PackingListDatasource) {
        super();
    }

    getSummaryByOrder(order: string): Promise<PackingListSummary | null> {
        return this.datasource.getSummaryByOrder(order);
    }
}
