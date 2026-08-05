/**
 * Piezas de identidad del vehículo. La placa es la firma visual: en portón y en
 * guía la unidad se referencia por su placa, no por su id, así que se compone
 * como una placa física —campo claro, filete oscuro, mono en versalitas con
 * tracking abierto— y solo en tamaño grande lleva la banda superior.
 */

import { VEHICLE_TYPES } from "@/features/vehicles/vehicles";
import { ImageOff, Truck } from "lucide-react";

type PlateProps = {
    plate: string;
    size?: "sm" | "lg";
}

export function VehiclePlate({ plate, size = "sm" }: PlateProps) {
    const field = size === "lg"
        ? "px-4 py-2 text-lg tracking-[0.3em]"
        : "px-2.5 py-1 text-[13px] tracking-[0.22em]";

    return (
        <span className="inline-flex flex-col overflow-hidden rounded-md border border-ink-deep bg-surface">
            {size === "lg" && (
                <span className="bg-ink-deep py-[3px] text-center font-mono text-[8px] uppercase tracking-[0.4em] text-canvas">
                    Placa
                </span>
            )}

            <span className={`font-mono font-medium uppercase text-ink-deep ${field}`}>
                {plate}
            </span>
        </span>
    );
}

type ThumbProps = {
    size?: "sm" | "lg";
}

export function VehicleThumb({ size = "sm" }: ThumbProps) {
    const dimensions = size === "lg" ? "h-16 w-16" : "h-9 w-9";

    return (
        <span
            aria-hidden
            className={`flex shrink-0 items-center justify-center rounded-lg bg-ink-deep text-canvas ${dimensions}`}
        >
            <Truck size={size === "lg" ? 26 : 16} />
        </span>
    );
}

/**
 * Fotografía de la unidad. La API todavía no arma la URL del archivo, así que
 * por ahora se compone la bahía vacía —mismo encuadre y mismo marco que tendrá
 * la foto— para que el panel no cambie de tamaño cuando llegue la imagen.
 */
export function VehiclePhoto() {
    return (
        <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-canvas text-ink-subtle">
            <ImageOff size={26} strokeWidth={1.5} aria-hidden />

            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                Sin fotografía
            </span>
        </div>
    );
}

type SpecProps = {
    brand: string;
    model: string;
    year: number;
}

export function VehicleSpec({ brand, model, year }: SpecProps) {
    return (
        <div className="min-w-0">
            <p className="truncate font-medium text-ink">
                {brand} {model}
            </p>
            <p className="font-mono text-[11px] tracking-[0.14em] text-ink-subtle">
                {year}
            </p>
        </div>
    );
}

/** La capacidad llega como cadena decimal ("15000.50"); se compone en mono porque es un dato de carga. */
const formatCapacity = (capacity: string) => {
    const kilograms = Number(capacity);

    if (Number.isNaN(kilograms)) return capacity;

    return kilograms.toLocaleString('es-GT', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

type CapacityProps = {
    capacity: string;
}

export function VehicleCapacity({ capacity }: CapacityProps) {
    return (
        <span className="font-mono text-sm text-ink">
            {formatCapacity(capacity)}
            <span className="ml-1 text-[11px] uppercase tracking-[0.14em] text-ink-subtle">kg</span>
        </span>
    );
}

const TYPE_LABELS: Record<string, string> = Object.fromEntries(
    VEHICLE_TYPES.map((type) => [type.value, type.label])
);

type TypeProps = {
    type: string;
}

export function VehicleTypeTag({ type }: TypeProps) {
    return (
        <span className="inline-flex items-center rounded-md border border-line bg-canvas px-2 py-1 text-xs text-ink-muted">
            {TYPE_LABELS[type] ?? type}
        </span>
    );
}

const STATUS_LABELS: Record<string, string> = {
    active: "Activo",
    inactive: "Inactivo",
    under_repair: "En taller",
};

const STATUS_DOTS: Record<string, string> = {
    active: "bg-success",
    under_repair: "bg-primary",
};

type StatusProps = {
    status: string;
}

export function VehicleStatus({ status }: StatusProps) {
    return (
        <span className="inline-flex items-center gap-2 text-sm text-ink-muted">
            <span className={`h-1.5 w-1.5 rounded-full ${STATUS_DOTS[status] ?? "bg-ink-subtle"}`} />
            {STATUS_LABELS[status] ?? status}
        </span>
    );
}
