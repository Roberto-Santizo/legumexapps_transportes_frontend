import type { PackingListSummary } from "@/features/packing-lists/packing-lists";

export abstract class PackingListRepository {
    abstract getSummaryByOrder(order: string): Promise<PackingListSummary | null>;
}
