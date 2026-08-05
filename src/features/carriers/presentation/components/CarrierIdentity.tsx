/**
 * Piezas de identidad del transportista. El código es la firma visual: en carga
 * el transportista se referencia por su código en la guía, no por su nombre, así
 * que se compone en mono, versalitas y tracking abierto, como un sello.
 */

type MonogramProps = {
    name: string;
    size?: "sm" | "lg";
}

const initials = (name: string) =>
    name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((word) => word[0] ?? "")
        .join("")
        .toUpperCase();

export function CarrierMonogram({ name, size = "sm" }: MonogramProps) {
    const dimensions = size === "lg" ? "h-16 w-16 text-lg" : "h-9 w-9 text-xs";

    return (
        <span
            aria-hidden
            className={`flex shrink-0 items-center justify-center rounded-full bg-ink-deep font-display font-semibold tracking-tight text-canvas ${dimensions}`}
        >
            {initials(name)}
        </span>
    );
}

type CodeProps = {
    code: string;
    size?: "sm" | "lg";
}

export function CarrierCodeStamp({ code, size = "sm" }: CodeProps) {
    const dimensions = size === "lg"
        ? "px-3 py-1.5 text-[13px] tracking-[0.24em]"
        : "px-2 py-1 text-[11px] tracking-[0.2em]";

    return (
        <span className={`inline-flex items-center gap-2 rounded-md border border-line bg-canvas font-mono uppercase text-ink ${dimensions}`}>
            {size === "lg" && <span className="h-2 w-2 rounded-[2px] bg-primary" />}
            {code}
        </span>
    );
}

type StatusProps = {
    active: boolean;
}

export function CarrierStatus({ active }: StatusProps) {
    return (
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-success" : "bg-ink-subtle"}`} />
            {active ? "Activo" : "Inactivo"}
        </span>
    );
}
