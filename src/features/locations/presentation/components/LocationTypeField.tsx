/**
 * El tipo del destino: puerto o destino ordinario. Dos valores fijos, sin
 * tercero posible, así que se eligen a la vista y no en una lista desplegable.
 *
 * No tiene valor por defecto a propósito. La API lo exige en el alta justo para
 * que nadie capture un puerto por inercia, y preseleccionar «Destino» aquí
 * devolvería ese problema al formulario.
 */

import type { LocationType } from "@/features/locations/locations";
import { LOCATION_TYPES, LOCATION_TYPE_LABELS } from "@/features/locations/locations";
import { Anchor, MapPin } from "lucide-react";
import type { ReactNode } from "react";

const TYPE_HINTS: Record<LocationType, string> = {
    port: "Terminal de embarque marítimo.",
    destination: "Bodega, centro de acopio, mercado o finca.",
};

const TYPE_ICONS: Record<LocationType, ReactNode> = {
    port: <Anchor size={18} />,
    destination: <MapPin size={18} />,
};

type Props = {
    value?: LocationType;
    onChange: (type: LocationType) => void;
    errorMessage?: string;
};

export function LocationTypeField({ value, onChange, errorMessage }: Props) {
    return (
        <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-gray-700">
                Tipo de destino
            </span>

            <div className="grid gap-3 sm:grid-cols-2">
                {LOCATION_TYPES.map((type) => {
                    const selected = value === type;

                    return (
                        <label
                            key={type}
                            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3.5 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ink/20 ${selected
                                ? "border-ink-deep bg-ink-deep text-canvas"
                                : "border-line bg-surface text-ink hover:border-line-strong"}`}
                        >
                            <input
                                type="radio"
                                name="location-type"
                                value={type}
                                checked={selected}
                                onChange={() => onChange(type)}
                                className="sr-only"
                            />

                            <span className={`mt-0.5 shrink-0 ${selected ? "text-canvas" : "text-ink-subtle"}`}>
                                {TYPE_ICONS[type]}
                            </span>

                            <span className="flex flex-col gap-1">
                                <span className="font-mono text-[11px] uppercase tracking-[0.18em]">
                                    {LOCATION_TYPE_LABELS[type]}
                                </span>

                                <span className={`text-xs ${selected ? "text-canvas/70" : "text-ink-muted"}`}>
                                    {TYPE_HINTS[type]}
                                </span>
                            </span>
                        </label>
                    );
                })}
            </div>

            <p className="text-xs text-ink-muted">
                Solo clasifica el destino: un puerto se cotiza igual que cualquier otro y admite las mismas tarifas.
            </p>

            <p className="text-red-400 text-xs">{errorMessage}</p>
        </div>
    );
}
