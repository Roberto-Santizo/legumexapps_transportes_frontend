import { z } from "zod";

/**
 * Es el único rincón del front que recibe snake_case: el resumen viene del
 * backend de packing lists, no del de transportes. La traducción a camelCase se
 * hace aquí, dentro del esquema, para que ni los componentes ni los tipos
 * arrastren la excepción.
 */
type SummaryNumbers = {
    total_boxes: number;
    gross_weight: number;
    net_weight: number;
};

/** Genérico para que el renglón conserve su `product` y los totales no lo inventen. */
const toCamelCase = <T extends SummaryNumbers>({ total_boxes, gross_weight, net_weight, ...rest }: T) => ({
    ...rest,
    totalBoxes: total_boxes,
    grossWeight: gross_weight,
    netWeight: net_weight,
});

const summaryNumbers = {
    total_boxes: z.number(),
    gross_weight: z.number(),
    net_weight: z.number(),
    /**
     * **Solo en jugos.** El contrato pide reconocer la variante por la
     * presencia de esta clave y no por `type`: es lo único que no miente si
     * mañana aparece un tercer tipo de packing list.
     */
    bottles: z.number().optional(),
};

/** Un renglón por producto, ya agrupado y sumado por el backend. */
export const PackingListProductSummarySchema = z.object({
    product: z.string(),
    ...summaryNumbers,
}).transform(toCamelCase);

/** Los totales generales: la suma de todos los renglones de `products`. */
export const PackingListTotalsSchema = z.object(summaryNumbers).transform(toCamelCase);

/**
 * El resumen consolidado de una orden. `destination` y `container` salen del
 * CTPAT relacionado —`container` es el número, no el id— y ninguno es nulo.
 */
export const PackingListSummarySchema = z.object({
    /** La orden **tal como está guardada**, que puede no ser la tecleada. */
    order: z.string(),
    destination: z.string(),
    container: z.string(),
    /** `1` = producto, cualquier otro = jugo. No lo uses para leer `bottles`. */
    type: z.number(),
    /** `customer` del packing list; si viene vacío, cae al destino del CTPAT. */
    client: z.string(),
    /** Vacío cuando el packing list no tiene items. Eso es un 200, no un 404. */
    products: z.array(PackingListProductSummarySchema),
    totals: PackingListTotalsSchema,
});
