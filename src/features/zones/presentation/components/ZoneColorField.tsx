import type { ZoneForm } from "@/features/zones/zones";
import { ZONE_DEFAULT_COLOR, ZONE_HEX_PATTERN } from "@/features/zones/zones";
import { Controller, type Control } from "react-hook-form";

/**
 * Los atajos salen de la paleta de la aplicación —ámbar, verde y rojo son los
 * mismos tokens que usa el resto de la interfaz— más el azul por defecto del
 * backend. Así un tablero con varias zonas sigue leyéndose como el producto y
 * no como un semáforo.
 */
const ZONE_COLOR_PRESETS = [
    { value: ZONE_DEFAULT_COLOR, label: "Azul" },
    { value: "#E8A33D", label: "Ámbar" },
    { value: "#2F7A52", label: "Verde" },
    { value: "#C0483C", label: "Rojo" },
    { value: "#7A4FBF", label: "Morado" },
    { value: "#12241C", label: "Tinta" },
];

type Props = {
    control: Control<ZoneForm>;
    errorMessage?: string;
}

export function ZoneColorField({ control, errorMessage }: Props) {
    return (
        <Controller
            control={control}
            name="color"
            rules={{
                required: "Elige un color para la zona",
                pattern: {
                    value: ZONE_HEX_PATTERN,
                    message: "El color debe ser hexadecimal con el formato #RRGGBB"
                }
            }}
            render={({ field }) => {
                const value = field.value ?? ZONE_DEFAULT_COLOR;
                const isValidHex = ZONE_HEX_PATTERN.test(value);

                const setHex = (raw: string) => {
                    const next = raw.startsWith('#') ? raw : `#${raw}`;
                    field.onChange(next.slice(0, 7).toUpperCase());
                };

                return (
                    <div className="flex flex-col gap-2">
                        <label className="text-sm font-medium text-gray-700" htmlFor="color">
                            Color en el mapa
                        </label>

                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-1.5">
                                {ZONE_COLOR_PRESETS.map((preset) => (
                                    <button
                                        key={preset.value}
                                        type="button"
                                        title={preset.label}
                                        aria-label={preset.label}
                                        aria-pressed={value.toUpperCase() === preset.value.toUpperCase()}
                                        onClick={() => setHex(preset.value)}
                                        style={{ backgroundColor: preset.value }}
                                        className={`h-7 w-7 cursor-pointer rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30 ${value.toUpperCase() === preset.value.toUpperCase()
                                            ? "ring-2 ring-ink ring-offset-2"
                                            : "border border-line-strong"
                                            }`}
                                    />
                                ))}
                            </div>

                            <span className="h-6 w-px bg-line" aria-hidden />

                            <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-2.5 py-1.5">
                                <input
                                    id="color"
                                    type="color"
                                    value={isValidHex ? value : ZONE_DEFAULT_COLOR}
                                    onChange={(event) => setHex(event.target.value)}
                                    className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent p-0"
                                />

                                <input
                                    type="text"
                                    value={value}
                                    onChange={(event) => setHex(event.target.value)}
                                    onBlur={field.onBlur}
                                    spellCheck={false}
                                    autoComplete="off"
                                    className="w-[9ch] bg-transparent font-mono text-[13px] uppercase text-ink focus:outline-none"
                                />
                            </label>
                        </div>

                        <p className="text-red-400 text-xs">{errorMessage}</p>
                    </div>
                );
            }}
        />
    );
}
