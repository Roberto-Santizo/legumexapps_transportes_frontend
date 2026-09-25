/**
 * Filtros del listado, en la URL para que la vista se pueda compartir: una
 * sola caja para código y nombre (el backend busca en los dos a la vez) y un
 * selector de cliente.
 */

import type { Option } from "@/features/shared/shared";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import Select from "react-select";
import type { SetURLSearchParams } from "react-router-dom";

const SEARCH_DEBOUNCE_MS = 400;

type Props = {
    search: string;
    clientId: string;
    clientOptions: Option[];
    isLoadingClients: boolean;
    setSearchParams: SetURLSearchParams;
}

export function FinishedProductFilterBar({ search, clientId, clientOptions, isLoadingClients, setSearchParams }: Props) {
    const [term, setTerm] = useState(search);
    const [syncedTerm, setSyncedTerm] = useState(search);

    /** La URL manda: si el filtro se limpia desde fuera, el input la sigue. */
    if (syncedTerm !== search) {
        setSyncedTerm(search);
        setTerm(search);
    }

    useEffect(() => {
        if (term === search) return;

        const value = term.trim();

        const timer = setTimeout(() => setSearchParams((params) => {
            if (value) {
                params.set('search', value);
            } else {
                params.delete('search');
            }

            params.set('page', '0');
            return params;
        }), SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [term, search, setSearchParams]);

    const selectedClient = clientOptions.find((option) => String(option.value) === clientId) ?? null;

    const handleClientChange = (option: Option | null) => setSearchParams((params) => {
        if (option) {
            params.set('clientId', String(option.value));
        } else {
            params.delete('clientId');
        }

        params.set('page', '0');
        return params;
    });

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4 sm:flex-row sm:items-start">
            <label className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Código o nombre
                </span>

                <span className="relative w-full sm:w-[22rem]">
                    <Search
                        size={14}
                        aria-hidden
                        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
                    />

                    <input
                        type="search"
                        value={term}
                        onChange={(event) => setTerm(event.target.value)}
                        placeholder="BRO-IQF-10, brócoli"
                        className="text_form_field w-full pl-9"
                    />
                </span>

                <span className="text-xs text-ink-subtle">
                    Una sola búsqueda cubre el código y el nombre. No distingue mayúsculas.
                </span>
            </label>

            <div className="flex flex-col gap-2 sm:w-[20rem]">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Cliente
                </span>

                <Select<Option>
                    options={clientOptions}
                    value={selectedClient}
                    onChange={handleClientChange}
                    isClearable
                    isSearchable
                    isLoading={isLoadingClients}
                    placeholder="Todos los clientes"
                    noOptionsMessage={() => 'Sin clientes'}
                    classNamePrefix="react-select"
                />
            </div>
        </div>
    );
}
