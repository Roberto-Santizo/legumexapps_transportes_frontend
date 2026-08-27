/**
 * Mismo contrato que `SelectFormField` —label, name, options, control,
 * validation— pero sin desplegable: las opciones se pintan siempre visibles,
 * como tarjetas.
 *
 * Se usa para los ejes cortos y cerrados de la unidad (tipo, condición, estado
 * operativo): son tres o cuatro valores que hay que comparar de un vistazo, y
 * esconderlos tras un dropdown obliga a abrirlo para saber qué se eligió.
 *
 * Cada tarjeta lleva su chapa de código —mono en versalitas, filete oscuro—
 * como la placa y el odómetro del resto de la ficha. La elegida invierte la
 * chapa a negativo: la selección se lee por forma, no solo por color.
 *
 * Semántica de radiogroup: una sola parada en el tab, flechas para moverse
 * entre tarjetas y Espacio/Enter para elegir, igual que un grupo de radios
 * nativo.
 */

import { Controller, type Control, type FieldValues, type Path, type RegisterOptions } from "react-hook-form";
import type { Option } from "@/features/shared/shared";
import { useId, useRef } from "react";

export type VehicleCardOption = Option & {
    /** Una línea de contexto bajo el título. No repetir el label. */
    description?: string;
    /** Chapa de la tarjeta. Sin ella se derivan las tres primeras letras del label. */
    code?: string;
    disabled?: boolean;
};

/** Clases estáticas: Tailwind no ve las que se arman concatenando. */
const COLUMNS: Record<1 | 2 | 3, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
};

/** La chapa se compone de tres caracteres: más ancho y deja de leerse como código. */
const plateCode = (option: VehicleCardOption) =>
    (option.code ?? option.label).replace(/[^\p{L}\p{N}]/gu, '').slice(0, 3).toUpperCase();

type Props<T extends FieldValues> = {
    label: string;
    name: Path<T>;
    options: VehicleCardOption[];
    errorMessage?: string;
    control: Control<T>;
    validation: RegisterOptions<T, Path<T>>;
    /** Texto de apoyo entre el label y las tarjetas. */
    description?: string;
    columns?: 1 | 2 | 3;
    disabled?: boolean;
};

export function VehicleCardSelectFormField<T extends FieldValues>({
    label,
    name,
    options,
    errorMessage,
    control,
    validation,
    description,
    columns = 2,
    disabled = false
}: Props<T>) {
    const groupId = useId();
    const cardsRef = useRef<(HTMLButtonElement | null)[]>([]);

    const isEnabled = (index: number) => !disabled && !options[index]?.disabled;

    /** Salta las opciones deshabilitadas y da la vuelta al llegar al extremo. */
    const nextEnabled = (from: number, step: number) => {
        const total = options.length;

        for (let offset = 1; offset <= total; offset++) {
            const index = (((from + step * offset) % total) + total) % total;
            if (isEnabled(index)) return index;
        }

        return -1;
    };

    return (
        <div className="flex flex-col gap-2">
            <span id={`${groupId}-label`} className="text-sm font-medium text-ink">
                {label}
            </span>

            {description && (
                <p className="text-xs text-ink-muted">{description}</p>
            )}

            <Controller
                name={name}
                control={control}
                rules={validation}
                render={({ field }) => {
                    if (options.length === 0) {
                        return (
                            <p className="rounded-xl border border-dashed border-line-strong bg-canvas/40 px-4 py-6 text-center font-mono text-[10px] uppercase tracking-[0.2em] text-ink-subtle">
                                Sin opciones
                            </p>
                        );
                    }

                    const selectedIndex = options.findIndex((option) => option.value === field.value);

                    /**
                     * Una sola tarjeta entra en el tab: la elegida, o la primera
                     * disponible mientras no haya elección.
                     */
                    const stopIndex = selectedIndex >= 0
                        ? selectedIndex
                        : options.findIndex((_, index) => isEnabled(index));

                    const move = (from: number, step: number) => {
                        const target = nextEnabled(from, step);
                        if (target < 0) return;

                        field.onChange(options[target].value);
                        cardsRef.current[target]?.focus();
                    };

                    return (
                        <div
                            role="radiogroup"
                            aria-labelledby={`${groupId}-label`}
                            aria-invalid={errorMessage ? true : undefined}
                            aria-describedby={errorMessage ? `${groupId}-error` : undefined}
                            className={`grid gap-3 ${COLUMNS[columns]}`}
                        >
                            {options.map((option, index) => {
                                const selected = index === selectedIndex;
                                const cardDisabled = !isEnabled(index);

                                return (
                                    <button
                                        key={option.value}
                                        ref={(node) => { cardsRef.current[index] = node; }}
                                        type="button"
                                        role="radio"
                                        aria-checked={selected}
                                        disabled={cardDisabled}
                                        tabIndex={index === stopIndex ? 0 : -1}
                                        onClick={() => field.onChange(option.value)}
                                        onBlur={field.onBlur}
                                        onKeyDown={(event) => {
                                            if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
                                                event.preventDefault();
                                                move(index, 1);
                                            }

                                            if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
                                                event.preventDefault();
                                                move(index, -1);
                                            }
                                        }}
                                        className={[
                                            "flex items-start gap-3 rounded-xl border bg-surface p-4 text-left transition-colors motion-reduce:transition-none",
                                            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ink/15",
                                            cardDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                                            selected ? "border-ink-deep ring-1 ring-ink-deep" : "border-line",
                                            !selected && !cardDisabled ? "hover:border-line-strong" : ""
                                        ].join(' ')}
                                    >
                                        {/* Chapa: en reposo va en campo claro con filete; elegida, en negativo. */}
                                        <span
                                            aria-hidden
                                            className={[
                                                "shrink-0 rounded-md border px-2 py-1 font-mono text-[11px] font-medium tracking-[0.18em] transition-colors motion-reduce:transition-none",
                                                selected
                                                    ? "border-ink-deep bg-ink-deep text-canvas"
                                                    : "border-line-strong bg-canvas text-ink-deep"
                                            ].join(' ')}
                                        >
                                            {plateCode(option)}
                                        </span>

                                        <span className="flex min-w-0 flex-col gap-1">
                                            <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
                                                {option.label}
                                            </span>

                                            {option.description && (
                                                <span className="text-xs leading-relaxed text-ink-muted">
                                                    {option.description}
                                                </span>
                                            )}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    );
                }}
            />

            <p id={`${groupId}-error`} className="text-xs text-danger">
                {errorMessage}
            </p>
        </div>
    );
}
