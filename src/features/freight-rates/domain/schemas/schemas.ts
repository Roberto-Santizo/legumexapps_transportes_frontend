import { ApiResponseSchema } from "@/features/shared/shared";
import { z } from "zod";

/**
 * Los importes viajan como cadena —son decimales exactos de base de datos— y
 * se conservan así hasta el momento de operar con ellos. `pricePerPound` trae
 * SEIS decimales: redondearlo antes de multiplicar cambia el total del flete.
 */
export const FreightRateSchema = z.object({
    id: z.number(),
    locationId: z.number(),
    locationName: z.string().nullable(),
    productId: z.number(),
    productName: z.string().nullable(),
    fuelType: z.string(),
    /** GTQ por galón. La tarifa rige DESDE este precio hacia arriba. */
    fuelMin: z.string(),
    /** GTQ por libra, seis decimales. */
    pricePerPound: z.string(),
    registeredByName: z.string().nullable(),
    /** Formato `d-m-Y h:i:s A`, no ISO: se muestra tal cual. */
    createdAt: z.string().nullable(),
    updatedAt: z.string().nullable(),
});

/**
 * Este listado NO pagina: es la lista de precios completa del destino, no un
 * histórico que se navegue. Por eso extiende el sobre simple y no el paginado.
 */
export const FreightRatesSchema = ApiResponseSchema.extend({
    data: z.array(FreightRateSchema)
});

/**
 * La cotización no es una tarifa: añade el precio de combustible vigente en el
 * servidor, la banda que se aplicó y el total. No persiste nada.
 */
export const FreightQuoteSchema = z.object({
    freightRateId: z.number(),
    locationId: z.number(),
    locationName: z.string().nullable(),
    productId: z.number(),
    productName: z.string().nullable(),
    fuelType: z.string(),
    /** Sale siempre del servidor; nunca se envía en la petición. */
    currentFuelPrice: z.string(),
    /** `fuelMin` de la banda elegida. Su distancia con el vigente delata una tarifa vieja. */
    appliedFuelMin: z.string(),
    pricePerPound: z.string(),
    pounds: z.string().nullable(),
    total: z.string().nullable(),
});
