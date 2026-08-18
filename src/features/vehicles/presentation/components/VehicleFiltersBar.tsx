/**
 * Los cuatro filtros del listado. Viven en la URL para que la vista filtrada
 * se pueda compartir y sobreviva a un refresco.
 *
 * El backend es tolerante hasta el punto de ser engañoso: un valor inválido no
 * da 422 ni una lista vacía, devuelve el listado entero. Por eso aquí no hay
 * texto libre salvo el número de motor, y las opciones salen de los catálogos
 * del dominio.
 */

import { carrierProvider } from "@/features/carriers/carriers";
import { VEHICLE_CONDITIONS, VEHICLE_STATUSES } from "@/features/vehicles/vehicles";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { SetURLSearchParams } from "react-router-dom";

/** El catálogo de transportistas no pagina en la práctica: se pide entero. */
const CARRIERS_LIMIT = '500';

/** Se espera a que el usuario deje de teclear antes de pedir el listado. */
const SEARCH_DEBOUNCE_MS = 400;

type Props = {
    status: string;
    condition: string;
    engineNumber: string;
    carrierId: string;
    /** El filtro por empresa solo se pinta a `administrator`: al `carrier` se le ignora en silencio. */
    showCarrierFilter: boolean;
    setSearchParams: SetURLSearchParams;
}

export function VehicleFiltersBar({
    status,
    condition,
    engineNumber,
    carrierId,
    showCarrierFilter,
    setSearchParams
}: Props) {
    /** Cambiar cualquier filtro devuelve el listado a la primera página. */
    const applyFilter = (key: string, value: string) => {
        setSearchParams((params) => {
            if (value) {
                params.set(key, value);
            } else {
                params.delete(key);
            }

            params.set('page', '0');
            return params;
        });
    };

    return (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-line bg-surface p-4">
            <EngineNumberSearch engineNumber={engineNumber} onSearch={(value) => applyFilter('engineNumber', value)} />

            <FilterSelect
                label="Estado"
                value={status}
                emptyLabel="Todos los estados"
                options={VEHICLE_STATUSES.map((option) => ({ value: String(option.value), label: option.label }))}
                onChange={(value) => applyFilter('status', value)}
            />

            <FilterSelect
                label="Condición"
                value={condition}
                emptyLabel="Nuevas y usadas"
                options={VEHICLE_CONDITIONS.map((option) => ({ value: String(option.value), label: option.label }))}
                onChange={(value) => applyFilter('condition', value)}
            />

            {showCarrierFilter && (
                <CarrierFilter carrierId={carrierId} onChange={(value) => applyFilter('carrierId', value)} />
            )}
        </div>
    );
}

type SearchProps = {
    engineNumber: string;
    onSearch: (value: string) => void;
}

/**
 * El número de motor casa por coincidencia parcial y sin distinguir mayúsculas,
 * así que basta con un fragmento. Las unidades sin número capturado nunca
 * aparecen en un resultado filtrado por aquí: no tienen qué buscar.
 */
function EngineNumberSearch({ engineNumber, onSearch }: SearchProps) {
    const [term, setTerm] = useState(engineNumber);
    const [syncedTerm, setSyncedTerm] = useState(engineNumber);

    /**
     * La URL manda: si el filtro se limpia desde fuera, el input la sigue. Se
     * ajusta durante el render y no en un efecto para no encadenar un segundo
     * render por cada tecleo.
     */
    if (syncedTerm !== engineNumber) {
        setSyncedTerm(engineNumber);
        setTerm(engineNumber);
    }

    useEffect(() => {
        if (term === engineNumber) return;

        const timer = setTimeout(() => onSearch(term.trim()), SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [term, engineNumber, onSearch]);

    return (
        <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Número de motor
            </span>

            <span className="relative">
                <Search
                    size={14}
                    aria-hidden
                    className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
                />

                <input
                    type="search"
                    value={term}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder="PE0137"
                    className="text_form_field min-w-[15rem] pl-9 font-mono uppercase"
                />
            </span>
        </label>
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

type CarrierFilterProps = {
    carrierId: string;
    onChange: (value: string) => void;
}

function CarrierFilter({ carrierId, onChange }: CarrierFilterProps) {
    const { data } = useQuery({
        queryKey: ['getCarriers', CARRIERS_LIMIT],
        queryFn: () => carrierProvider.getCarriers(CARRIERS_LIMIT, '0')
    });

    const carriers = data?.data ?? [];

    return (
        <FilterSelect
            label="Empresa"
            value={carrierId}
            emptyLabel="Todas las empresas"
            options={carriers.map((carrier) => ({ value: String(carrier.id), label: carrier.name }))}
            onChange={onChange}
        />
    );
}
