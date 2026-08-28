import type { PackingListSummary } from "@/features/packing-lists/packing-lists";

export abstract class PackingListDatasource {
    /**
     * `null` cuando ninguna de las dos tablas de packing list tiene esa orden.
     * No es un error: la orden puede existir solo en la cabeza de quien publica
     * el viaje, y el formulario tiene que dejarlo seguir.
     */
    abstract getSummaryByOrder(order: string): Promise<PackingListSummary | null>;
}
