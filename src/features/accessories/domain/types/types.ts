import type { AccessorySchema, PaginatedAccessoriesSchema } from "@/features/accessories/accessories";
import type { z } from "zod";

export type PaginatedAccessories = z.infer<typeof PaginatedAccessoriesSchema>;
export type Accessory = z.infer<typeof AccessorySchema>;
export type AccessoryStatus = Accessory['status'];

export type AccessoryForm = {
    name: string;
    code: string;
    /** Único campo que admite `null`: mandarlo así borra la descripción guardada. */
    description?: string | null;
    /** Numérico en [0.01, 99999999.99]: un precio de cero se rechaza. */
    price: number;
    /** Se envía en `Y-m-d` y no puede ser futura. */
    purchaseDate: string;
    /** Porcentaje anual en [0, 100]. El cero es válido: no se deprecia nunca. */
    annualDepreciation: number;
    /** Solo se edita: el accesorio nace `active` y el alta no acepta este campo. */
    status?: string;
}

/** Filtros del listado. El backend los ignora en silencio si llegan mal: nunca da 422. */
export type AccessoryFilters = {
    /** `active` | `inactive` | `under_repair`. Cualquier otro valor devuelve los tres estados. */
    status?: string;
    /** Coincidencia parcial sobre nombre **y** código a la vez. No cubre la descripción. */
    search?: string;
}
