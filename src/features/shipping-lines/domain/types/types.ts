import type { PaginatedShippingLinesSchema, ShippingLineSchema } from "@/features/shipping-lines/shipping-lines";
import type { z } from "zod";

export type PaginatedShippingLines = z.infer<typeof PaginatedShippingLinesSchema>;
export type ShippingLine = z.infer<typeof ShippingLineSchema>;

/**
 * El único campo que acepta la API: cualquier otra clave se descarta en
 * silencio. En el alta es obligatorio; en la edición es opcional y un cuerpo
 * vacío es un no-op válido con 200 que ni siquiera mueve `updatedAt`.
 */
export type ShippingLineForm = {
    /** El backend lo recorta, colapsa sus espacios internos y lo pasa a MAYÚSCULAS. */
    name: string;
}

/** El único campo del formulario al que se puede anclar un error del backend. */
export type ShippingLineField = keyof ShippingLineForm;

/** El backend ignora en silencio un filtro mal escrito: nunca da 422. */
export type ShippingLineFilters = {
    /** Coincidencia parcial sobre el nombre. En blanco se ignora. */
    search?: string;
}
