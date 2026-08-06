/**
 * Piezas de identidad del precio. La cifra es la firma visual: un precio de
 * combustible se lee en la pizarra de la gasolinera antes de entrar, así que se
 * compone como esa rotulación —mono de ancho fijo, quetzales pequeño al frente,
 * centavos en menor jerarquía y la unidad de despacho al final—. Hereda el color
 * del contenedor para servir igual sobre la pizarra oscura y sobre la tabla.
 */

import { FUEL_PRICE_STATUS_LABELS, FUEL_TYPE_LABELS } from "@/features/fuel-prices/fuel-prices";

/** El precio llega como cadena decimal ("32.45"); se parte para poder jerarquizar los centavos. */
const splitPrice = (price: string) => {
    const amount = Number(price);

    if (Number.isNaN(amount)) return null;

    const [integer, fraction = "00"] = amount.toFixed(2).split(".");

    return { integer: Number(integer).toLocaleString('es-GT'), fraction };
}

type FigureSize = "sm" | "md" | "lg";

const FIGURE_SIZES: Record<FigureSize, { currency: string; integer: string; fraction: string; unit: string }> = {
    sm: {
        currency: "text-[10px] tracking-[0.12em]",
        integer: "text-sm",
        fraction: "text-sm",
        unit: "text-[10px] tracking-[0.14em]"
    },
    md: {
        currency: "text-[11px] tracking-[0.16em]",
        integer: "text-[28px] leading-none",
        fraction: "text-lg leading-none",
        unit: "text-[10px] tracking-[0.18em]"
    },
    lg: {
        currency: "text-sm tracking-[0.16em]",
        integer: "text-[44px] leading-none",
        fraction: "text-2xl leading-none",
        unit: "text-[11px] tracking-[0.18em]"
    },
};

type FigureProps = {
    price: string;
    size?: FigureSize;
}

export function FuelPriceFigure({ price, size = "sm" }: FigureProps) {
    const parts = splitPrice(price);
    const scale = FIGURE_SIZES[size];

    if (!parts) return <span className="font-mono">{price}</span>;

    return (
        <span className="inline-flex items-baseline gap-1 font-mono tabular-nums">
            <span className={`font-medium opacity-55 ${scale.currency}`}>Q</span>

            <span className={`font-medium ${scale.integer}`}>
                {parts.integer}
                <span className={scale.fraction}>.{parts.fraction}</span>
            </span>

            <span className={`uppercase opacity-45 ${scale.unit}`}>/gal</span>
        </span>
    );
}

type TypeProps = {
    fuelType: string;
}

export function FuelTypeTag({ fuelType }: TypeProps) {
    return (
        <span className="inline-flex items-center rounded-md border border-line bg-canvas px-2 py-1 text-xs text-ink-muted">
            {FUEL_TYPE_LABELS[fuelType] ?? fuelType}
        </span>
    );
}

const STATUS_DOTS: Record<string, string> = {
    active: "bg-success",
};

type StatusProps = {
    status: string;
}

export function FuelPriceStatus({ status }: StatusProps) {
    return (
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? "bg-ink-subtle"}`} />
            {FUEL_PRICE_STATUS_LABELS[status] ?? status}
        </span>
    );
}

/**
 * El backend manda la fecha con seis decimales de segundo; el estándar admite
 * tres, así que se recortan antes de parsear para no depender del navegador.
 */
const parseMoment = (value: string) => {
    const date = new Date(value.replace(/(\.\d{3})\d+/, '$1'));

    return Number.isNaN(date.getTime()) ? null : date;
}

const dateFormatter = new Intl.DateTimeFormat('es-GT', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
});

const timeFormatter = new Intl.DateTimeFormat('es-GT', {
    hour: '2-digit',
    minute: '2-digit'
});

type MomentProps = {
    value: string;
    /** En la ficha el precio se rastrea al minuto; en la tabla basta el día. */
    withTime?: boolean;
}

export function FuelPriceMoment({ value, withTime = false }: MomentProps) {
    const date = parseMoment(value);

    if (!date) return <span className="font-mono text-sm text-ink">{value}</span>;

    return (
        <span className="font-mono text-[13px] text-ink">
            {dateFormatter.format(date)}
            {withTime && (
                <span className="ml-2 text-ink-subtle">{timeFormatter.format(date)}</span>
            )}
        </span>
    );
}
