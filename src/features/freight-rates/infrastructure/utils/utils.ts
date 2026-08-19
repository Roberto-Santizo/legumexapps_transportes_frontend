/**
 * Único punto del front donde se convierten los importes de la API a número,
 * se arma el payload y se traduce un error del backend a un texto para el
 * usuario. Si aparece un `Number(rate.pricePerPound)` en cualquier otro
 * archivo, está mal: el redondeo prematuro de la tarifa por libra es el error
 * caro de este dominio.
 */

import type { FreightRate, FreightRateForm } from "@/features/freight-rates/freight-rates";
import type { Option } from "@/features/shared/shared";
import { isAxiosError } from "axios";

/**
 * Catálogo de combustibles. Replica el enum del backend; una tarifa se cotiza
 * para uno de estos cuatro y las bandas solo compiten entre sí dentro del mismo.
 */
export const FREIGHT_FUEL_TYPES: Option[] = [
    { value: "regular", label: "Regular" },
    { value: "premium", label: "Premium" },
    { value: "diesel", label: "Diésel" },
    { value: "diesel_premium", label: "Diésel Premium" },
];

export const FREIGHT_FUEL_TYPE_LABELS: Record<string, string> = Object.fromEntries(
    FREIGHT_FUEL_TYPES.map((type) => [type.value, type.label])
);

/** Límites que valida el backend. Se replican para no gastar un 422. */
export const FUEL_MIN_RANGE = { min: 0.01, max: 999999.99 };
export const PRICE_PER_POUND_RANGE = { min: 0.000001, max: 999999.999999 };

/**
 * Un `fuelMin` de un dígito casi siempre es un `30` al que le falta el cero: el
 * backend lo acepta sin rechistar y la banda pasa a ser la más barata del par.
 * No bloquea el envío —hay combustibles baratos—, solo avisa.
 */
export const SUSPICIOUS_FUEL_MIN = 10;

/** Decimales con los que viaja cada importe. La tarifa por libra lleva seis. */
const FUEL_MIN_DECIMALS = 2;
const PRICE_PER_POUND_DECIMALS = 6;

/** Cadena de la API → número. Un importe ilegible se trata como 0, nunca como NaN. */
export const toAmount = (value: string | null): number => {
    const amount = Number(value);

    return Number.isFinite(amount) ? amount : 0;
};

/** Solo para mostrar. Nunca se opera sobre el resultado de esta función. */
export const formatQuetzales = (value: string | null, decimals = FUEL_MIN_DECIMALS): string =>
    `Q${toAmount(value).toFixed(decimals)}`;

/**
 * Parte la tarifa por libra en los dos decimales que se leen y los cuatro que
 * hacen la diferencia al multiplicar. Se pintan juntos para que la precisión
 * quede a la vista sin que la cifra deje de leerse de un vistazo.
 */
export const splitPricePerPound = (value: string): { head: string; tail: string } => {
    const fixed = toAmount(value).toFixed(PRICE_PER_POUND_DECIMALS);

    return {
        head: fixed.slice(0, fixed.indexOf('.') + 3),
        tail: fixed.slice(fixed.indexOf('.') + 3)
    };
};

/**
 * Total del flete. Multiplica sobre la tarifa completa y redondea solo al
 * final: hacerlo al revés se come 185 quetzales en un contenedor de 45 000 lb.
 */
export const calculateFreightTotal = (pounds: number, pricePerPound: string): number =>
    Number((pounds * toAmount(pricePerPound)).toFixed(2));

/** El backend rechaza las cadenas del formulario: los cinco campos viajan numéricos. */
export const buildFreightRatePayload = (form: FreightRateForm): FreightRateForm => ({
    locationId: Number(form.locationId),
    productId: Number(form.productId),
    fuelType: form.fuelType,
    fuelMin: Number(form.fuelMin),
    pricePerPound: Number(form.pricePerPound)
});

/**
 * Agrupa las bandas por producto y, dentro de cada producto, por combustible.
 * Es la única lectura útil de la lista: una banda solo compite con las del
 * mismo par, así que fuera de ese grupo el `fuelMin` no dice nada.
 */
export type FreightRateGroup = {
    productId: number;
    productName: string;
    fuelTypes: {
        fuelType: string;
        rates: FreightRate[];
    }[];
}

export const groupFreightRates = (rates: FreightRate[]): FreightRateGroup[] => {
    const groups = new Map<number, FreightRateGroup>();

    for (const rate of rates) {
        const group = groups.get(rate.productId) ?? {
            productId: rate.productId,
            productName: rate.productName ?? 'Producto sin nombre',
            fuelTypes: []
        };

        const fuelGroup = group.fuelTypes.find((entry) => entry.fuelType === rate.fuelType);

        if (fuelGroup) {
            fuelGroup.rates.push(rate);
        } else {
            group.fuelTypes.push({ fuelType: rate.fuelType, rates: [rate] });
        }

        groups.set(rate.productId, group);
    }

    /** Las bandas se leen de la más barata a la más cara, como una escalera. */
    for (const group of groups.values()) {
        for (const fuelGroup of group.fuelTypes) {
            fuelGroup.rates.sort((a, b) => toAmount(a.fuelMin) - toAmount(b.fuelMin));
        }
    }

    return [...groups.values()].sort((a, b) => a.productName.localeCompare(b.productName));
};

/**
 * El backend responde con dos formas distintas: el sobre `{ statusCode,
 * message, data }` para 400/401/403/404 y el formato de Laravel
 * `{ message, errors }` para el 422. En el 422 el `message` trae la coletilla
 * «(and 2 more errors)», así que se prefieren los mensajes de `errors`, que ya
 * vienen redactados en español y nombran el campo que falla.
 */
export const getFreightRateErrorMessage = (error: unknown): string => {
    if (!isAxiosError(error)) return "Error no controlado.";

    const data = error.response?.data;

    if (data && typeof data === 'object') {
        const { errors, message } = data as { errors?: unknown; message?: unknown };

        if (errors && typeof errors === 'object') {
            const messages = Object.values(errors as Record<string, unknown>)
                .flatMap((entry) => Array.isArray(entry) ? entry : [entry])
                .filter((entry): entry is string => typeof entry === 'string');

            if (messages.length > 0) return messages.join(' · ');
        }

        if (typeof message === 'string') return message;
    }

    return "Error no controlado.";
};
