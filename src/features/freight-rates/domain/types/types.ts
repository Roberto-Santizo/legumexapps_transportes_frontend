import type { FreightQuoteSchema, FreightRateSchema, FreightRatesSchema } from "@/features/freight-rates/freight-rates";
import type { z } from "zod";

export type FreightRates = z.infer<typeof FreightRatesSchema>;
export type FreightRate = z.infer<typeof FreightRateSchema>;
export type FreightQuote = z.infer<typeof FreightQuoteSchema>;

/**
 * En el formulario los importes se capturan como número; la API los devuelve
 * como cadena. `registeredBy` no existe aquí: sale del token.
 */
export type FreightRateForm = {
    locationId: number;
    productId: number;
    fuelType: string;
    /** GTQ por galón, [0.01, 999999.99]. */
    fuelMin: number;
    /** GTQ por libra, [0.000001, 999999.999999]. */
    pricePerPound: number;
}

/**
 * El destino se manda por `id`, no por punto: `lat` y `lng` ya no cotizan
 * nada. Sin `pounds` la respuesta llega igual, pero con `pounds` y `total` en
 * `null`.
 */
export type FreightQuoteForm = {
    locationId: number;
    productId: number;
    fuelType: string;
    pounds?: number;
}
