import type { Option } from "@/features/shared/shared";

/**
 * Catálogo de combustibles. Es la única fuente: alimenta el select del
 * formulario, las etiquetas de la tabla y la pizarra. Los valores replican el
 * enum `FuelType` del backend (regular, premium, diesel, diesel_premium).
 */
export const FUEL_TYPES: Option[] = [
    { value: "regular", label: "Regular" },
    { value: "premium", label: "Premium" },
    { value: "diesel", label: "Diésel" },
    { value: "diesel_premium", label: "Diésel Premium" },
];

export type FuelGroup = {
    label: string;
    types: string[];
}

/**
 * Los combustibles se agrupan por surtidor, no por precio: lo que decide a qué
 * manguera llega una unidad es si toma gasolina o diésel. Esa es la lectura de
 * la pizarra, y por eso agrupa así en lugar de listar los cuatro en fila.
 */
export const FUEL_GROUPS: FuelGroup[] = [
    { label: "Gasolina", types: ["regular", "premium"] },
    { label: "Diésel", types: ["diesel", "diesel_premium"] },
];

export const FUEL_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    FUEL_TYPES.map((type) => [type.value, type.label])
);

/** Estados del registro. Un precio vigente es el que se usa para costear; el resto es historial. */
export const FUEL_PRICE_STATUS_LABELS: Record<string, string> = {
    active: "Vigente",
    inactive: "Histórico",
};
