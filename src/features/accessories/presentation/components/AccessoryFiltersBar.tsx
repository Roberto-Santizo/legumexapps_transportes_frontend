/**
 * Los dos filtros del listado. Viven en la URL para que la vista filtrada se
 * pueda compartir y sobreviva a un refresco.
 *
 * El buscador es uno solo porque el backend busca en nombre y código a la vez:
 * separarlos en dos campos prometería una precisión que la API no da. Un valor
 * de estado inválido no da 422 ni lista vacía, devuelve el inventario entero,
 * así que las opciones salen del catálogo del dominio y no de texto libre.
 */

import { ACCESSORY_STATUSES } from "@/features/accessories/accessories";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { SetURLSearchParams } from "react-router-dom";

/** Se espera a que el usuario deje de teclear antes de pedir el listado. */
const SEARCH_DEBOUNCE_MS = 400;

type Props = {
    status: string;
    search: string;
    setSearchParams: SetURLSearchParams;
}

export function AccessoryFiltersBar({ status, search, setSearchParams }: Props) {
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
            <AccessorySearch search={search} onSearch={(value) => applyFilter('search', value)} />

            <label className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Estado
                </span>

                <select
                    value={status}
                    onChange={(event) => applyFilter('status', event.target.value)}
                    className="text_form_field min-w-[12rem] cursor-pointer"
                >
                    <option value="">Todos los estados</option>

                    {ACCESSORY_STATUSES.map((option) => (
                        <option key={String(option.value)} value={String(option.value)}>
                            {option.label}
                        </option>
                    ))}
                </select>
            </label>
        </div>
    );
}

type SearchProps = {
    search: string;
    onSearch: (value: string) => void;
}

function AccessorySearch({ search, onSearch }: SearchProps) {
    const [term, setTerm] = useState(search);
    const [syncedTerm, setSyncedTerm] = useState(search);

    /**
     * La URL manda: si el filtro se limpia desde fuera, el input la sigue. Se
     * ajusta durante el render y no en un efecto para no encadenar un segundo
     * render por cada tecleo.
     */
    if (syncedTerm !== search) {
        setSyncedTerm(search);
        setTerm(search);
    }

    useEffect(() => {
        if (term === search) return;

        const timer = setTimeout(() => onSearch(term.trim()), SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [term, search, onSearch]);

    return (
        <label className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Nombre o código
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
                    placeholder="Gato hidráulico, ACC-0012"
                    className="text_form_field min-w-[18rem] pl-9"
                />
            </span>
        </label>
    );
}
