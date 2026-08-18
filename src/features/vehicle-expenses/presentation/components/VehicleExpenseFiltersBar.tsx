/**
 * Los cuatro filtros del historial. Viven en el estado del panel y no en la
 * URL: el detalle del vehículo ya usa la ruta para identificar la unidad, y el
 * historial es una lectura dentro de esa ficha, no una pantalla propia.
 *
 * El backend es tolerante hasta el punto de ser engañoso: un valor inválido no
 * da 422 ni una lista vacía, devuelve el historial entero. Por eso aquí no hay
 * texto libre y las opciones salen de los catálogos del dominio.
 */

import type { VehicleExpenseFilters } from "@/features/vehicle-expenses/vehicle-expenses";
import {
    todayAsInputValue,
    VEHICLE_EXPENSE_CATEGORIES,
    VEHICLE_EXPENSE_NATURES
} from "@/features/vehicle-expenses/vehicle-expenses";
import { X } from "lucide-react";

type Props = {
    filters: VehicleExpenseFilters;
    onChange: (filters: VehicleExpenseFilters) => void;
}

export function VehicleExpenseFiltersBar({ filters, onChange }: Props) {
    const applyFilter = (key: keyof VehicleExpenseFilters, value: string) =>
        onChange({ ...filters, [key]: value });

    const hasFilters = Boolean(filters.category || filters.nature || filters.dateFrom || filters.dateTo);

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-canvas/40 p-4">
            <FilterSelect
                label="Categoría"
                value={filters.category ?? ''}
                emptyLabel="Todas las categorías"
                options={VEHICLE_EXPENSE_CATEGORIES.map((option) => ({ value: String(option.value), label: option.label }))}
                onChange={(value) => applyFilter('category', value)}
            />

            {/* Naturaleza y categoría son ejes independientes: elegir una no acota la otra. */}
            <FilterSelect
                label="Naturaleza"
                value={filters.nature ?? ''}
                emptyLabel="Preventivos y correctivos"
                options={VEHICLE_EXPENSE_NATURES.map((option) => ({ value: String(option.value), label: option.label }))}
                onChange={(value) => applyFilter('nature', value)}
            />

            <FilterDate
                label="Desde"
                value={filters.dateFrom ?? ''}
                onChange={(value) => applyFilter('dateFrom', value)}
            />

            <FilterDate
                label="Hasta"
                value={filters.dateTo ?? ''}
                onChange={(value) => applyFilter('dateTo', value)}
            />

            {hasFilters && (
                <button
                    type="button"
                    onClick={() => onChange({})}
                    className="inline-flex cursor-pointer items-center gap-1.5 pb-2.5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    <X size={13} aria-hidden />
                    Quitar filtros
                </button>
            )}
        </div>
    );
}

type FilterSelectProps = {
    label: string;
    value: string;
    emptyLabel: string;
    options: { value: string; label: string }[];
    onChange: (value: string) => void;
}

function FilterSelect({ label, value, emptyLabel, options, onChange }: FilterSelectProps) {
    return (
        <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </span>

            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="text_form_field min-w-[12rem] cursor-pointer"
            >
                <option value="">{emptyLabel}</option>

                {options.map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </label>
    );
}

type FilterDateProps = {
    label: string;
    value: string;
    onChange: (value: string) => void;
}

/** Las cotas son inclusive y nunca miran al futuro: no hay gastos por venir. */
function FilterDate({ label, value, onChange }: FilterDateProps) {
    return (
        <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </span>

            <input
                type="date"
                value={value}
                max={todayAsInputValue()}
                onChange={(event) => onChange(event.target.value)}
                className="text_form_field cursor-pointer"
            />
        </label>
    );
}
