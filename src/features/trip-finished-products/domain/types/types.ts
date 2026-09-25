import type { TripFinishedProductSchema } from "@/features/trip-finished-products/trip-finished-products";
import type { z } from "zod";

export type TripFinishedProduct = z.infer<typeof TripFinishedProductSchema>;

/** Una línea del body de `POST /api/trips` (`products[]`). */
export type TripProductLine = {
    finishedProductId: number;
    /** Entero de 1 a 999999. */
    boxes: number;
}

/**
 * El estado de una fila del formulario de alta del viaje, que **no es el
 * payload**: la fila nace sin producto y las cajas llegan como `NaN` si el
 * input numérico está vacío. Los `required` garantizan el paso al payload.
 */
export type TripProductLineValues = {
    finishedProductId?: number;
    boxes?: number;
}

/** `registeredBy` no se acepta: sale del token. */
export type TripFinishedProductPayload = {
    tripId: number;
    finishedProductId: number;
    boxes: number;
}

/**
 * La línea **solo edita `boxes`**. `tripId` y `finishedProductId` se ignoran
 * en silencio: cambiar de producto es borrar la línea y crear otra.
 */
export type TripFinishedProductUpdatePayload = {
    boxes: number;
}

/** El formulario de alta y edición de una línea desde el detalle del viaje. */
export type TripFinishedProductForm = {
    /** Solo en el alta: en la edición el producto es inmutable. */
    finishedProductId?: number;
    boxes: number;
}

/** Los campos a los que se puede anclar un error del backend. */
export type TripFinishedProductField = keyof TripFinishedProductForm;
