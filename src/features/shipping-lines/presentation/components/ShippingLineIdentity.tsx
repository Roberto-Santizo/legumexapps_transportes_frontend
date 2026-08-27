/**
 * Piezas de identidad de la naviera. El registro guarda **un solo campo**, así
 * que la identidad es literalmente el nombre: no hay código ni sigla que lo
 * acompañe, y por eso se pinta en display, con peso, como la placa que es.
 *
 * Se pinta **tal como llega en la respuesta** —ya recortado, con los espacios
 * internos colapsados y en mayúsculas por el backend—, nunca como lo tecleó el
 * usuario.
 */

import { formatShippingLineMoment } from "@/features/shipping-lines/shipping-lines";

type Size = "sm" | "lg";

const NAME_SIZES: Record<Size, string> = {
    sm: "text-[15px] tracking-tight",
    lg: "text-[30px] leading-none tracking-tight",
};

type NameProps = {
    name: string;
    size?: Size;
}

export function ShippingLineName({ name, size = "sm" }: NameProps) {
    return (
        <span className={`font-display font-semibold uppercase ${NAME_SIZES[size]}`}>
            {name}
        </span>
    );
}

type MomentProps = {
    /** Llega en `d-m-Y h:i:s A`; si no encaja se pinta tal cual. */
    value: string | null;
    /** En la ficha el registro se rastrea al minuto; en la tabla basta el día. */
    withTime?: boolean;
}

export function ShippingLineMoment({ value, withTime = false }: MomentProps) {
    if (!value) return <span className="text-sm text-ink-subtle">Sin registro</span>;

    return (
        <span className="font-mono text-[13px] text-ink">
            {formatShippingLineMoment(value, withTime)}
        </span>
    );
}
