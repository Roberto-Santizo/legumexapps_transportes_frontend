/**
 * El único filtro del listado. Vive en la URL para que la vista filtrada se
 * pueda compartir y sobreviva a un refresco.
 *
 * Busca sobre el nombre, que es el único campo del dominio. El backend
 * normaliza el término igual que la columna, así que no distingue mayúsculas ni
 * espacios de sobra; en blanco se ignora y devuelve el catálogo completo.
 */

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { SetURLSearchParams } from "react-router-dom";

/** Se espera a que el usuario deje de teclear antes de pedir el listado. */
const SEARCH_DEBOUNCE_MS = 400;

type Props = {
    search: string;
    setSearchParams: SetURLSearchParams;
}

export function ShippingLineSearchBar({ search, setSearchParams }: Props) {
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

        const value = term.trim();

        /** Buscar devuelve el listado a la primera página. */
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

    return (
        <div className="rounded-xl border border-line bg-surface p-4">
            <label className="flex flex-col gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Nombre de la naviera
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
                        placeholder="Maersk, Hapag"
                        className="text_form_field w-full pl-9"
                    />
                </span>

                <span className="text-xs text-ink-subtle">
                    Basta con una parte del nombre. No distingue mayúsculas.
                </span>
            </label>
        </div>
    );
}
