/**
 * Piezas de identidad del accesorio y la regla de depreciación.
 *
 * Una fila es una unidad física —cuatro llantas iguales son cuatro registros—,
 * así que lo que identifica al accesorio es el código de su etiqueta: se pinta
 * en mono, como el número de lote que es, y el nombre acompaña en display.
 *
 * La regla de depreciación es el único elemento propio de este dominio: la
 * parte rayada es el valor ya consumido y la sólida el que queda. Como la
 * depreciación es lineal, ese mismo corte es «hoy» en la línea que va del día
 * de la compra al día en que el accesorio vale cero: la barra se lee a la vez
 * como dinero y como tiempo.
 */

import type { Accessory } from "@/features/accessories/accessories";
import {
    ACCESSORY_STATUS_LABELS,
    formatAccessoryDate,
    formatDate,
    formatQuetzales,
    getAccessoryDepreciation
} from "@/features/accessories/accessories";

type Size = "sm" | "lg";

type CodeProps = {
    code: string;
    size?: Size;
}

const CODE_SIZES: Record<Size, string> = {
    sm: "text-[13px] tracking-[0.12em]",
    lg: "text-[15px] tracking-[0.2em]",
};

export function AccessoryCode({ code, size = "sm" }: CodeProps) {
    return (
        <span className={`font-mono uppercase ${CODE_SIZES[size]}`}>
            {code}
        </span>
    );
}

type NameProps = {
    name: string;
    size?: Size;
}

const NAME_SIZES: Record<Size, string> = {
    sm: "text-[15px] tracking-tight",
    lg: "text-[30px] leading-none tracking-tight",
};

export function AccessoryName({ name, size = "sm" }: NameProps) {
    return (
        <span className={`font-display font-semibold uppercase ${NAME_SIZES[size]}`}>
            {name}
        </span>
    );
}

/** Los tres estados llevan color propio: en reparación no es una baja. */
const STATUS_DOTS: Record<string, string> = {
    active: "bg-success",
    under_repair: "bg-primary",
    inactive: "bg-ink-subtle",
};

type StatusProps = {
    status: string;
}

export function AccessoryStatusTag({ status }: StatusProps) {
    return (
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? "bg-ink-subtle"}`} />
            {ACCESSORY_STATUS_LABELS[status] ?? status}
        </span>
    );
}

type MoneyProps = {
    value: string;
    muted?: boolean;
}

export function AccessoryMoney({ value, muted = false }: MoneyProps) {
    return (
        <span className={`font-mono text-[13px] tabular-nums ${muted ? "text-ink-muted" : "text-ink"}`}>
            {formatQuetzales(value)}
        </span>
    );
}

/** El tramo consumido se raya en lugar de rellenarse: es valor que ya no está. */
const CONSUMED_HATCH = {
    backgroundImage: "repeating-linear-gradient(135deg, var(--color-line-strong) 0 2px, transparent 2px 5px)"
};

type RuleProps = {
    accessory: Accessory;
    size?: Size;
}

export function AccessoryValueRule({ accessory, size = "sm" }: RuleProps) {
    const { remainingRatio, currentValue, price, lostValue, exhaustedAt, isExhausted } =
        getAccessoryDepreciation(accessory);

    const consumedPercent = `${(1 - remainingRatio) * 100}%`;
    const remainingPercent = `${remainingRatio * 100}%`;
    const height = size === "lg" ? "h-2" : "h-1.5";

    const bar = (
        <span
            className={`flex w-full overflow-hidden rounded-full bg-line ${height}`}
            role="img"
            aria-label={`Quedan ${formatQuetzales(accessory.currentValue)} de ${formatQuetzales(accessory.price)}`}
        >
            <span style={{ ...CONSUMED_HATCH, width: consumedPercent }} className="block" />
            <span
                style={{ width: remainingPercent }}
                className={`block ${isExhausted ? "bg-transparent" : "bg-ink"}`}
            />
        </span>
    );

    if (size === "sm") {
        return (
            <span className="flex w-32 flex-col gap-1.5">
                <AccessoryMoney value={accessory.currentValue} />
                {bar}
            </span>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <div className="flex items-baseline justify-between gap-4">
                <span className="font-mono text-[34px] leading-none tabular-nums text-ink">
                    {formatQuetzales(accessory.currentValue)}
                </span>

                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-subtle">
                    {price > 0 ? `${Math.round(remainingRatio * 100)} % del precio` : "Sin precio"}
                </span>
            </div>

            {bar}

            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 font-mono text-[11px] text-ink-subtle">
                <span>
                    {formatQuetzales(accessory.price)} el {formatAccessoryDate(accessory.purchaseDate)}
                </span>

                <span>
                    {exhaustedAt
                        ? (isExhausted
                            ? `Vale cero desde ${formatDate(exhaustedAt)}`
                            : `Llega a cero el ${formatDate(exhaustedAt)}`)
                        : "No se deprecia"}
                </span>
            </div>

            {lostValue > 0 && (
                <p className="text-sm text-ink-muted">
                    Ha perdido{" "}
                    <span className="font-mono tabular-nums text-ink">
                        {formatQuetzales(lostValue.toFixed(2))}
                    </span>{" "}
                    desde la compra. El valor se recalcula cada día: mañana será otro.
                </p>
            )}

            {currentValue === price && (
                <p className="text-sm text-ink-muted">
                    Todavía vale lo que costó.
                </p>
            )}
        </div>
    );
}
