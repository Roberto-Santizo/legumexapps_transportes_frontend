import type { PackingListSummary } from "@/features/packing-lists/packing-lists";

/**
 * Los pesos se guardan como `float` y las sumas llegan con ruido decimal
 * (`1380.0000000000002`). Se redondea a dos decimales y se recortan los ceros:
 * `1380` se pinta `1380`, no `1380.00`.
 */
export const formatPackingListWeight = (value: number): string =>
    String(Number(value.toFixed(2)));

/** `120` → `"120"`. Las cajas y las botellas son enteros, pero no está de más. */
export const formatPackingListCount = (value: number): string =>
    new Intl.NumberFormat('es-GT').format(Math.round(value));

/**
 * Los jugos se reconocen por traer `bottles`, **nunca por `type`**: es lo que
 * recomienda el contrato y lo único que aguanta un tercer tipo de packing list.
 */
export const hasPackingListBottles = (summary: PackingListSummary): boolean =>
    summary.totals.bottles !== undefined;

/** El texto que acompaña al resumen: la variante que resolvió el backend. */
export const packingListTypeLabel = (summary: PackingListSummary): string =>
    hasPackingListBottles(summary) ? "Jugo" : "Producto";
