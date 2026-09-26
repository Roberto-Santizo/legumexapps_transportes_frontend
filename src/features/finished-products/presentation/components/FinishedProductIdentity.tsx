/**
 * Piezas de identidad del SKU. Se pintan **tal como llegan en la respuesta**
 * (normalizadas por el backend), nunca como las tecleó el usuario.
 */

import { formatFinishedProductAmount, formatFinishedProductMoment } from "@/features/finished-products/finished-products";

type Size = "sm" | "lg";

const CODE_SIZES: Record<Size, string> = {
    sm: "text-[13px] tracking-[0.12em]",
    lg: "text-[15px] tracking-[0.2em]",
};

export function FinishedProductCode({ code, size = "sm" }: { code: string; size?: Size }) {
    return (
        <span className={`font-mono uppercase ${CODE_SIZES[size]}`}>
            {code}
        </span>
    );
}

const NAME_SIZES: Record<Size, string> = {
    sm: "text-[15px] tracking-tight",
    lg: "text-[28px] leading-tight tracking-tight",
};

/** `whitespace-pre-wrap`: la API conserva los espacios tal cual y se muestran así. */
export function FinishedProductName({ name, size = "sm" }: { name: string; size?: Size }) {
    return (
        <span className={`font-display font-semibold uppercase whitespace-pre-wrap ${NAME_SIZES[size]}`}>
            {name}
        </span>
    );
}

/** Cantidad decimal alineada a la derecha, en mono para que las columnas cuadren. */
export function FinishedProductAmount({ value }: { value: string }) {
    return (
        <span className="font-mono text-[13px] tabular-nums text-ink">
            {formatFinishedProductAmount(value)}
        </span>
    );
}

type MomentProps = {
    /** Llega en `d-m-Y h:i:s A`; si no encaja se pinta tal cual. */
    value: string | null;
    withTime?: boolean;
}

export function FinishedProductMoment({ value, withTime = false }: MomentProps) {
    if (!value) return <span className="text-sm text-ink-subtle">Sin registro</span>;

    return (
        <span className="font-mono text-[13px] text-ink">
            {formatFinishedProductMoment(value, withTime)}
        </span>
    );
}
