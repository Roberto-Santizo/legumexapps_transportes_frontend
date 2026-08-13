/**
 * Piezas de identidad del producto. El nombre es la firma visual: el registro
 * no guarda nada más, así que se compone como la rotulación de una caja de
 * exportación —display, versalitas y tracking apretado— con el id al lado en
 * mono, a modo de número de lote. Hereda el color del contenedor para servir
 * igual sobre la placa oscura de la ficha y sobre la tabla.
 */

import { PRODUCT_STATUS_LABELS } from "@/features/products/products";

type NameSize = "sm" | "lg";

const NAME_SIZES: Record<NameSize, string> = {
    sm: "text-[15px] tracking-tight",
    lg: "text-[34px] leading-none tracking-tight",
};

type NameProps = {
    name: string;
    size?: NameSize;
}

export function ProductName({ name, size = "sm" }: NameProps) {
    return (
        <span className={`font-display font-semibold uppercase ${NAME_SIZES[size]}`}>
            {name}
        </span>
    );
}

type StatusProps = {
    status: boolean;
}

export function ProductStatus({ status }: StatusProps) {
    return (
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${status ? "bg-success" : "bg-ink-subtle"}`} />
            {PRODUCT_STATUS_LABELS[String(status) as 'true' | 'false']}
        </span>
    );
}

/**
 * El backend manda la fecha en formato local (`dd-MM-yyyy hh:mm:ss AM/PM`), que
 * `Date` no parsea: se desarma a mano para no depender del navegador.
 */
const MOMENT_PATTERN = /^(\d{2})-(\d{2})-(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)$/i;

const parseMoment = (value: string) => {
    const parts = MOMENT_PATTERN.exec(value.trim());

    if (!parts) return null;

    const [, day, month, year, rawHour, minute, second, meridiem] = parts;

    const hour = Number(rawHour) % 12 + (meridiem.toUpperCase() === 'PM' ? 12 : 0);

    const date = new Date(
        Number(year),
        Number(month) - 1,
        Number(day),
        hour,
        Number(minute),
        Number(second)
    );

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
    /** En la ficha el registro se rastrea al minuto; en la tabla basta el día. */
    withTime?: boolean;
}

export function ProductMoment({ value, withTime = false }: MomentProps) {
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
