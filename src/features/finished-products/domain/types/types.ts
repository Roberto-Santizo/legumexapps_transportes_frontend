import type { FinishedProductSchema, PaginatedFinishedProductsSchema } from "@/features/finished-products/finished-products";
import type { z } from "zod";

export type PaginatedFinishedProducts = z.infer<typeof PaginatedFinishedProductsSchema>;
export type FinishedProduct = z.infer<typeof FinishedProductSchema>;

/**
 * Lo que captura el formulario. Las dos cantidades se teclean como texto (el
 * detalle las devuelve como `"10.00"`) y se convierten a número al armar el
 * payload.
 */
export type FinishedProductForm = {
    code: string;
    name: string;
    presentation: string;
    boxesPerPallet: string;
    clientId: number | null;
}

/** El cuerpo que acepta la API. Cualquier otra clave se descarta en silencio. */
export type FinishedProductPayload = {
    code: string;
    name: string;
    presentation: number;
    boxesPerPallet: number;
    clientId: number;
}

/** En el `PATCH` los cinco son opcionales por separado; cuerpo vacío = no-op con 200. */
export type FinishedProductUpdatePayload = Partial<FinishedProductPayload>;

/** Los campos del formulario a los que se puede anclar un error del backend. */
export type FinishedProductField = keyof FinishedProductForm;

/** El backend ignora en silencio un filtro mal escrito: nunca da 422. */
export type FinishedProductFilters = {
    /** Coincidencia parcial sobre el código **y** el nombre a la vez. */
    search?: string;
    clientId?: string;
}
