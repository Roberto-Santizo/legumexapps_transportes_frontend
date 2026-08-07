/**
 * El estado llega como booleano: un producto activo es el que se puede elegir
 * al armar un viaje; uno inactivo queda en el catálogo solo para no romper los
 * registros históricos que ya lo referencian.
 */
export const PRODUCT_STATUS_LABELS: Record<'true' | 'false', string> = {
    true: "Activo",
    false: "Inactivo",
};
