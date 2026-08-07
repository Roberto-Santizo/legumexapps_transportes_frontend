import type { FuelPriceSchema, PaginatedFuelPricesSchema } from "@/features/fuel-prices/fuel-prices";
import type { z } from "zod";

export type PaginatedFuelPrices = z.infer<typeof PaginatedFuelPricesSchema>;
export type FuelPrice = z.infer<typeof FuelPriceSchema>;

export type FuelPriceForm = {
    fuelType: string;
    /** El backend devuelve el precio como cadena decimal; en el formulario se captura como número. */
    price: number;
}
