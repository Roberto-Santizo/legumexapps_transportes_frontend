/**
 * Piezas de identidad del destino. Lo que distingue a un destino de otro no es
 * su nombre —lo teclea una persona— sino el punto exacto al que apunta, así
 * que las coordenadas viajan con él en monoespaciada y con todos sus decimales:
 * son el dato que se compara de un vistazo en una tabla larga.
 */

import { LOCATION_STATUS_LABELS, formatCoordinates } from "@/features/locations/locations";
import { MapPin } from "lucide-react";

type NameSize = "sm" | "lg";

const NAME_SIZES: Record<NameSize, string> = {
    sm: "text-[15px] tracking-tight",
    lg: "text-[32px] leading-none tracking-tight",
};

type NameProps = {
    name: string;
    size?: NameSize;
}

export function LocationName({ name, size = "sm" }: NameProps) {
    return (
        <span className={`font-display font-semibold uppercase ${NAME_SIZES[size]}`}>
            {name}
        </span>
    );
}

type PinProps = {
    active?: boolean;
    size?: number;
}

/** Marca visual del destino en la tabla: un pin, no una silueta. */
export function LocationPinGlyph({ active = true, size = 30 }: PinProps) {
    return (
        <span
            className={`inline-flex shrink-0 items-center justify-center rounded-xl border ${active ? "border-line-strong bg-canvas text-ink" : "border-dashed border-line-strong text-ink-subtle"}`}
            style={{ width: size, height: size }}
            aria-hidden
        >
            <MapPin size={Math.round(size * 0.5)} />
        </span>
    );
}

type StatusProps = {
    status: boolean;
}

export function LocationStatus({ status }: StatusProps) {
    return (
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${status ? "bg-success" : "bg-ink-subtle"}`} />
            {LOCATION_STATUS_LABELS[String(status) as 'true' | 'false']}
        </span>
    );
}

type CoordinatesProps = {
    latitude: string | number;
    longitude: string | number;
    /** El detalle muestra los ocho decimales que guarda la base; la tabla, cinco. */
    exact?: boolean;
}

export function LocationCoordinates({ latitude, longitude, exact = false }: CoordinatesProps) {
    if (!exact) {
        return (
            <span className="font-mono text-[13px] text-ink">
                {formatCoordinates(latitude, longitude)}
            </span>
        );
    }

    return (
        <span className="flex flex-col gap-0.5 font-mono text-[13px] text-ink">
            <span>
                <span className="mr-2 text-ink-subtle">lat</span>
                {latitude}
            </span>
            <span>
                <span className="mr-2 text-ink-subtle">lng</span>
                {longitude}
            </span>
        </span>
    );
}

type PlaceProps = {
    googlePlaceId: string;
}

/** Identificador opaco de Google. Se muestra entero: es lo que ancla el destino. */
export function LocationPlaceTag({ googlePlaceId }: PlaceProps) {
    return (
        <span className="inline-flex max-w-full items-center gap-2 rounded-lg border border-line bg-canvas px-2.5 py-1">
            <MapPin size={13} className="shrink-0 text-ink-subtle" />
            <span className="truncate font-mono text-[12px] text-ink">{googlePlaceId}</span>
        </span>
    );
}

type MomentProps = {
    /** Llega como d-m-Y h:i:s A, no como ISO: se muestra tal cual, sin parsear. */
    value: string | null;
    withTime?: boolean;
}

export function LocationMoment({ value, withTime = false }: MomentProps) {
    if (!value) return <span className="text-sm text-ink-subtle">—</span>;

    const [date, ...rest] = value.trim().split(/\s+/);
    const time = rest.join(' ');

    return (
        <span className="font-mono text-[13px] text-ink">
            {date}
            {withTime && time && <span className="ml-2 text-ink-subtle">{time}</span>}
        </span>
    );
}
