/**
 * Mismo contrato que `CardSelectFormField` —label, description, options con
 * `description`/`meta`/`icon`— pero en desplegable con buscador.
 *
 * Para listas largas (pilotos de una empresa): las tarjetas obligan a recorrer
 * toda la cuadrícula; aquí se teclea y se filtra por nombre, descripción
 * (correo) o meta (empresa) a la vez. Cada opción conserva la misma anatomía
 * de la tarjeta para que lo elegido se reconozca igual.
 */

import { Controller, type Control, type FieldValues, type Path, type RegisterOptions } from "react-hook-form";
import Select, { type FilterOptionOption } from "react-select";
import { useId } from "react";
import type { CardOption } from "./CardSelectFormField";

type Props<T extends FieldValues> = {
    label: string;
    name: Path<T>;
    options: CardOption[];
    errorMessage?: string;
    control: Control<T>;
    validation: RegisterOptions<T, Path<T>>;
    description?: string;
    placeholder?: string;
    noOptionsMessage?: string;
    isLoading?: boolean;
    disabled?: boolean;
};

/** Sin acentos ni mayúsculas: «hernández» encuentra «Hernandez». */
const normalize = (text: string) =>
    text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

const matches = ({ data }: FilterOptionOption<CardOption>, input: string) => {
    const query = normalize(input.trim());
    if (!query) return true;

    const haystack = normalize([data.label, data.description, data.meta].filter(Boolean).join(" "));
    return query.split(/\s+/).every((word) => haystack.includes(word));
};

export function SearchSelectFormField<T extends FieldValues>({
    label,
    name,
    options,
    errorMessage,
    control,
    validation,
    description,
    placeholder = "Busca por nombre, correo o empresa",
    noOptionsMessage = "Sin coincidencias",
    isLoading = false,
    disabled = false
}: Props<T>) {
    const fieldId = useId();

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor={`${fieldId}-input`} className="text-sm font-medium text-ink">
                {label}
            </label>

            {description && (
                <p id={`${fieldId}-description`} className="text-xs text-ink-muted">{description}</p>
            )}

            <Controller
                name={name}
                control={control}
                rules={validation}
                render={({ field }) => (
                    <Select<CardOption>
                        inputId={`${fieldId}-input`}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        options={options}
                        value={options.find((option) => option.value === field.value) ?? null}
                        onChange={(selected) => field.onChange(selected?.value)}
                        filterOption={matches}
                        isOptionDisabled={(option) => Boolean(option.disabled)}
                        isDisabled={disabled}
                        isLoading={isLoading}
                        isSearchable
                        unstyled
                        placeholder={placeholder}
                        noOptionsMessage={() => noOptionsMessage}
                        loadingMessage={() => "Cargando…"}
                        menuPlacement="auto"
                        maxMenuHeight={288}
                        aria-invalid={Boolean(errorMessage)}
                        aria-describedby={errorMessage ? `${fieldId}-error` : description ? `${fieldId}-description` : undefined}
                        formatOptionLabel={(option, { context }) => (
                            context === "value" ? (
                                <span className="flex min-w-0 items-center gap-2.5">
                                    {option.icon && <span className="shrink-0 text-ink">{option.icon}</span>}
                                    <span className="truncate font-display text-[15px] font-semibold tracking-tight text-ink">
                                        {option.label}
                                    </span>
                                    {option.meta && (
                                        <span className="hidden truncate font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle sm:inline">
                                            {option.meta}
                                        </span>
                                    )}
                                </span>
                            ) : (
                                <span className="flex items-start gap-3">
                                    {option.icon && <span className="mt-0.5 shrink-0 text-ink-subtle">{option.icon}</span>}
                                    <span className="flex min-w-0 flex-col gap-0.5">
                                        <span className="font-display text-[15px] font-semibold tracking-tight text-ink">
                                            {option.label}
                                        </span>
                                        {option.description && (
                                            <span className="truncate text-xs leading-relaxed text-ink-muted">
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
                            )
                        )}
                        classNames={{
                            control: ({ isFocused, isDisabled }) => [
                                "min-h-12 rounded-xl border bg-surface px-3.5 transition",
                                isDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                                errorMessage
                                    ? "border-danger"
                                    : isFocused
                                        ? "border-ink ring-3 ring-ink/15"
                                        : "border-line-strong hover:border-ink-subtle"
                            ].join(" "),
                            valueContainer: () => "gap-1 py-2",
                            placeholder: () => "text-sm text-ink-subtle",
                            input: () => "text-sm text-ink",
                            singleValue: () => "min-w-0",
                            indicatorsContainer: () => "gap-1 text-ink-subtle",
                            dropdownIndicator: ({ isFocused }) => `p-1 transition-colors ${isFocused ? "text-ink" : "hover:text-ink"}`,
                            loadingIndicator: () => "p-1",
                            indicatorSeparator: () => "hidden",
                            menu: () => "mt-2 overflow-hidden rounded-xl border border-line bg-surface shadow-[0_8px_24px_-6px_rgba(11,23,18,0.18)]",
                            menuList: () => "p-1.5",
                            option: ({ isFocused, isSelected, isDisabled }) => [
                                "relative rounded-lg px-3 py-2.5 transition-colors",
                                isDisabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                                isSelected ? "bg-canvas" : isFocused ? "bg-canvas/60" : ""
                            ].join(" "),
                            noOptionsMessage: () => "px-3 py-4 text-sm text-ink-muted",
                            loadingMessage: () => "px-3 py-4 text-sm text-ink-muted"
                        }}
                    />
                )}
            />

            <p id={`${fieldId}-error`} className="text-xs text-danger">
                {errorMessage}
            </p>
        </div>
    );
}
