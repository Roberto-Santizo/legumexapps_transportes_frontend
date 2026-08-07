/**
 * Piezas de identidad del vehículo. La placa es la firma visual: en portón y en
 * guía la unidad se referencia por su placa, no por su id, así que se compone
 * como una placa física —campo claro, filete oscuro, mono en versalitas con
 * tracking abierto— y solo en tamaño grande lleva la banda superior.
 */

import { VEHICLE_TYPES } from "@/features/vehicles/vehicles";
import { Dialog, Transition } from "@headlessui/react";
import { ImageOff, Maximize2, Truck, X } from "lucide-react";
import { Fragment, useState } from "react";

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
                <span className="bg-ink-deep py-0.75 text-center font-mono text-[8px] uppercase tracking-[0.4em] text-canvas">
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

/** El backend expone los archivos fuera de `/api`, así que la ruta relativa se cuelga de esa raíz. */
const ASSETS_BASE_URL = (import.meta.env.VITE_BASE_URL ?? '').replace(/\/api\/?$/, '');

const resolveImageUrl = (image: string) => {
    if (/^(https?:|data:|blob:)/.test(image)) return image;

    return `${ASSETS_BASE_URL}/${image.replace(/^\//, '')}`;
}

type PhotoProps = {
    image?: string | null;
    alt?: string;
    /** Si se pasa, la ampliación rotula la foto con la placa en lugar del texto alterno. */
    plate?: string;
}

/**
 * Fotografía de la unidad. Sin archivo —o si la URL no carga— se compone la
 * bahía vacía con el mismo encuadre y marco que la foto, para que el panel no
 * cambie de tamaño entre un caso y otro.
 *
 * Con foto el marco es un botón: al abrirlo la unidad se ve completa, sin el
 * recorte 4/3 de la ficha, rotulada con su placa.
 */
export function VehiclePhoto({ image, alt = "Fotografía del vehículo", plate }: PhotoProps) {
    /** Se guarda la URL que falló, no un booleano, para que otra unidad vuelva a intentar cargar. */
    const [brokenUrl, setBrokenUrl] = useState<string | null>(null);
    const [expanded, setExpanded] = useState(false);

    const source = image ? resolveImageUrl(image) : null;

    if (!source || source === brokenUrl) {
        return (
            <div className="flex aspect-4/3 w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-line-strong bg-canvas text-ink-subtle">
                <ImageOff size={26} strokeWidth={1.5} aria-hidden />

                <span className="font-mono text-[10px] uppercase tracking-[0.2em]">
                    Sin fotografía
                </span>
            </div>
        );
    }

    return (
        <>
            <button
                type="button"
                onClick={() => setExpanded(true)}
                aria-label="Ampliar fotografía"
                className="group relative block w-full cursor-pointer overflow-hidden rounded-xl border border-line focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-deep/25"
            >
                <img
                    src={source}
                    alt={alt}
                    loading="lazy"
                    onError={() => setBrokenUrl(source)}
                    className="aspect-4/3 w-full object-cover"
                />

                {/* La marca de ampliar solo aparece al apuntar o tabular: en reposo manda la foto. */}
                <span className="pointer-events-none absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-md bg-ink-deep/80 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.2em] text-canvas opacity-0 transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                    <Maximize2 size={11} aria-hidden />
                    Ampliar
                </span>
            </button>

            <VehiclePhotoDialog
                open={expanded}
                onClose={() => setExpanded(false)}
                source={source}
                alt={alt}
                plate={plate}
            />
        </>
    );
}

type PhotoDialogProps = {
    open: boolean;
    onClose: () => void;
    source: string;
    alt: string;
    plate?: string;
}

/**
 * Ampliación de la fotografía. Se compone como una placa fotográfica de patio:
 * fondo apagado, la unidad al centro sin recortar y la placa como pie de foto,
 * que es como se identifica la unidad en el resto de la ficha.
 */
function VehiclePhotoDialog({ open, onClose, source, alt, plate }: PhotoDialogProps) {
    return (
        <Transition appear show={open} as={Fragment}>
            <Dialog as="div" className="relative z-50" onClose={onClose}>
                <Transition.Child
                    as={Fragment}
                    enter="ease-out duration-200"
                    enterFrom="opacity-0"
                    enterTo="opacity-100"
                    leave="ease-in duration-150"
                    leaveFrom="opacity-100"
                    leaveTo="opacity-0"
                >
                    <div className="fixed inset-0 bg-ink-deep/85 backdrop-blur-sm" />
                </Transition.Child>

                <div className="fixed inset-0 overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 sm:p-8">
                        <Transition.Child
                            as={Fragment}
                            enter="ease-out duration-200"
                            enterFrom="opacity-0 scale-95"
                            enterTo="opacity-100 scale-100"
                            leave="ease-in duration-150"
                            leaveFrom="opacity-100 scale-100"
                            leaveTo="opacity-0 scale-95"
                        >
                            <Dialog.Panel className="flex w-full max-w-3xl flex-col items-center gap-5">
                                <Dialog.Title className="sr-only">{alt}</Dialog.Title>

                                <div className="relative w-full">
                                    <img
                                        src={source}
                                        alt={alt}
                                        className="max-h-[72vh] w-full rounded-xl border border-canvas/15 bg-ink-deep object-contain shadow-2xl"
                                    />

                                    <button
                                        type="button"
                                        onClick={onClose}
                                        aria-label="Cerrar fotografía"
                                        className="absolute top-3 right-3 inline-flex cursor-pointer items-center justify-center rounded-md bg-ink-deep/80 p-1.5 text-canvas transition-colors hover:bg-ink-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-canvas/40 motion-reduce:transition-none"
                                    >
                                        <X size={16} />
                                    </button>
                                </div>

                                {plate
                                    ? <VehiclePlate plate={plate} size="lg" />
                                    : (
                                        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-canvas/60">
                                            {alt}
                                        </p>
                                    )}
                            </Dialog.Panel>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition>
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
