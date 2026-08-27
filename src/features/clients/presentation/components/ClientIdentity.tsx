/**
 * Piezas de identidad del cliente. El registro solo guarda dos campos, así que
 * la identidad es exactamente eso: el código que viene del ERP —en mono, como
 * la referencia externa que es— y la razón social en display.
 *
 * Los dos se pintan **tal como llegan en la respuesta**, ya recortados y en
 * mayúsculas por el backend, nunca como los tecleó el usuario.
 */

import { formatClientMoment } from "@/features/clients/clients";

type Size = "sm" | "lg";

const CODE_SIZES: Record<Size, string> = {
    sm: "text-[13px] tracking-[0.12em]",
    lg: "text-[15px] tracking-[0.2em]",
};

type CodeProps = {
    code: string;
    size?: Size;
}

export function ClientCode({ code, size = "sm" }: CodeProps) {
    return (
        <span className={`font-mono uppercase ${CODE_SIZES[size]}`}>
            {code}
        </span>
    );
}

const NAME_SIZES: Record<Size, string> = {
    sm: "text-[15px] tracking-tight",
    lg: "text-[30px] leading-none tracking-tight",
};

type NameProps = {
    name: string;
    size?: Size;
}

export function ClientName({ name, size = "sm" }: NameProps) {
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

export function ClientMoment({ value, withTime = false }: MomentProps) {
    if (!value) return <span className="text-sm text-ink-subtle">Sin registro</span>;

    return (
        <span className="font-mono text-[13px] text-ink">
            {formatClientMoment(value, withTime)}
        </span>
    );
}
