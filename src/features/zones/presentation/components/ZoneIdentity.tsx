/**
 * Piezas de identidad de la zona. Lo que distingue a una zona de otra no es su
 * nombre sino su forma sobre el mapa, así que la silueta viaja con ella: se
 * dibuja el propio anillo en SVG, a escala, junto al nombre. Es el dato real
 * del registro, no un adorno, y se lee de un vistazo en una tabla larga.
 */

import type { LatLngPair } from "@/features/zones/zones";
import { ZONE_STATUS_LABELS, toGlyphPoints } from "@/features/zones/zones";

type GlyphProps = {
    area: LatLngPair[];
    color: string;
    size?: number;
}

export function ZoneGlyph({ area, color, size = 30 }: GlyphProps) {
    const points = toGlyphPoints(area, size);

    if (!points) {
        return (
            <span
                className="inline-block shrink-0 rounded-md border border-dashed border-line-strong"
                style={{ width: size, height: size }}
                aria-hidden
            />
        );
    }

    return (
        <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="shrink-0"
            role="img"
            aria-label="Silueta del área"
        >
            <polygon
                points={points}
                fill={color}
                fillOpacity={0.22}
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
            />
        </svg>
    );
}

type NameSize = "sm" | "lg";

const NAME_SIZES: Record<NameSize, string> = {
    sm: "text-[15px] tracking-tight",
    lg: "text-[32px] leading-none tracking-tight",
};

type NameProps = {
    name: string;
    size?: NameSize;
}

export function ZoneName({ name, size = "sm" }: NameProps) {
    return (
        <span className={`font-display font-semibold uppercase ${NAME_SIZES[size]}`}>
            {name}
        </span>
    );
}

type StatusProps = {
    status: boolean;
}

export function ZoneStatus({ status }: StatusProps) {
    return (
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${status ? "bg-success" : "bg-ink-subtle"}`} />
            {ZONE_STATUS_LABELS[String(status) as 'true' | 'false']}
        </span>
    );
}

type VerticesProps = {
    area: LatLngPair[];
}

export function ZoneVertices({ area }: VerticesProps) {
    return (
        <span className="font-mono text-[13px] text-ink">
            {area.length}
            <span className="ml-1 text-ink-subtle">pts</span>
        </span>
    );
}

type ColorProps = {
    color: string;
}

export function ZoneColorTag({ color }: ColorProps) {
    return (
        <span className="inline-flex items-center gap-2">
            <span
                className="h-3.5 w-3.5 rounded-full border border-line-strong"
                style={{ backgroundColor: color }}
            />
            <span className="font-mono text-[13px] uppercase text-ink">{color}</span>
        </span>
    );
}

type MomentProps = {
    /** Llega como `d-m-Y h:i:s A`, no como ISO: se muestra tal cual, sin parsear. */
    value: string | null;
    withTime?: boolean;
}

export function ZoneMoment({ value, withTime = false }: MomentProps) {
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
