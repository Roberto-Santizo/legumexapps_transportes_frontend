/**
 * Mismo contrato que `SelectFormField` —label, name, options, control,
 * validation— pero sin desplegable: las opciones se pintan siempre visibles,
 * como tarjetas.
 *
 * Se usa cuando la elección es corta y hay que compararla de un vistazo (un
 * turno, una empresa, un tipo de licencia): esconder tres opciones detrás de un
 * dropdown obliga a abrirlo para saber qué se está eligiendo.
 *
 * Semántica de radiogroup: una sola parada en el tab, flechas para moverse
 * entre tarjetas y Espacio/Enter para elegir, igual que un grupo de radios
 * nativo.
 */

import { Controller, type Control, type FieldValues, type Path, type RegisterOptions } from "react-hook-form";
import type { Option } from "@/features/shared/shared";
import { useId, useRef, type ReactNode } from "react";

export type CardOption = Option & {
    /** Una línea de contexto bajo el título. No repetir el label. */
    description?: string;
    /** Dato corto que se pinta en versalitas mono: un código, un conteo, una tarifa. */
    meta?: string;
    icon?: ReactNode;
    disabled?: boolean;
};

/** Clases estáticas: Tailwind no ve las que se arman concatenando. */
const COLUMNS: Record<1 | 2 | 3, string> = {
    1: "grid-cols-1",
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
};

type Props<T extends FieldValues> = {
    label: string;
    name: Path<T>;
    options: CardOption[];
    errorMessage?: string;
    control: Control<T>;
    validation: RegisterOptions<T, Path<T>>;
    /** Texto de apoyo entre el label y las tarjetas. */
    description?: string;
    columns?: 1 | 2 | 3;
    disabled?: boolean;
};

export function CardSelectFormField<T extends FieldValues>({
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
                                            "group relative overflow-hidden rounded-xl border bg-surface p-4 pl-5 text-left transition",
                                            "focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ink/15",
                                            cardDisabled ? "cursor-not-allowed border-line opacity-55" : "cursor-pointer",
                                            selected ? "border-ink shadow-[0_1px_2px_rgba(11,23,18,0.08)]" : "border-line",
                                            !selected && !cardDisabled ? "hover:border-line-strong hover:bg-canvas/40" : ""
                                        ].join(' ')}
                                    >
                                        {/* Señal de carretera: el tramo elegido se marca en ámbar. */}
                                        <span
                                            aria-hidden
                                            className={`absolute inset-y-0 left-0 w-[3px] transition-colors ${selected ? "bg-primary" : "bg-transparent"}`}
                                        />

                                        <span className="flex items-start gap-3">
                                            {option.icon && (
                                                <span className={`mt-0.5 shrink-0 transition-colors ${selected ? "text-ink" : "text-ink-subtle"}`}>
                                                    {option.icon}
                                                </span>
                                            )}

                                            <span className="flex min-w-0 flex-col gap-1">
                                                <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
                                                    {option.label}
                                                </span>

                                                {option.description && (
                                                    <span className="text-xs leading-relaxed text-ink-muted">
                                                        {option.description}
                                                    </span>
                                                )}

                                                {option.meta && (
                                                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                                        {option.meta}
                                                    </span>
                                                )}
                                            </span>
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
