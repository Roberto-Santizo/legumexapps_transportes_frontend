/**
 * Los filtros del listado, en la URL para que una vista filtrada se pueda
 * compartir y sobreviva a un refresco.
 *
 * Se ofrecen cuatro de los diez que acepta la API —los que se piden con la
 * ficha delante— y se deja fuera todo lo que necesitaría cargar otro catálogo
 * para elegir un id. Los del backend son tolerantes: un valor mal escrito no da
 * error, devuelve el listado completo, y por eso las dos fechas se descartan
 * antes de salir si no son `Y-m-d`.
 *
 * Lo que **no** se puede filtrar, y conviene no prometer: el destino final es
 * texto libre y no tiene filtro, y el administrador no puede acotar por empresa
 * asignataria —no existe `?carrierId=`, el ámbito lo aplica el rol—.
 */

import { TRIP_STATUSES } from "@/features/trips/trips";
import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import type { SetURLSearchParams } from "react-router-dom";

/** Se espera a que el usuario deje de teclear antes de pedir el listado. */
const SEARCH_DEBOUNCE_MS = 400;

type Props = {
    search: string;
    status: string;
    dateFrom: string;
    dateTo: string;
    setSearchParams: SetURLSearchParams;
}

/** Cualquier cambio de filtro devuelve el listado a la primera página. */
const applyFilter = (setSearchParams: SetURLSearchParams, key: string, value: string) =>
    setSearchParams((params) => {
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }

        params.set('page', '0');
        return params;
    });

export function TripFiltersBar({ search, status, dateFrom, dateTo, setSearchParams }: Props) {
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

        const timer = setTimeout(
            () => applyFilter(setSearchParams, 'search', term.trim()),
            SEARCH_DEBOUNCE_MS
        );

        return () => clearTimeout(timer);
    }, [term, search, setSearchParams]);

    return (
        <div className="flex flex-col gap-4 rounded-xl border border-line bg-surface p-4">
            <div className="flex flex-wrap items-end gap-4">
                <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Orden o contenedor
                    </span>

                    <span className="relative block w-full sm:w-[22rem]">
                        <Search
                            size={14}
                            aria-hidden
                            className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-subtle"
                        />

                        <input
                            type="search"
                            value={term}
                            onChange={(event) => setTerm(event.target.value)}
                            placeholder="ORD-2026 0148, MSKU"
                            className="text_form_field w-full pl-9"
                        />
                    </span>
                </label>

                <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Estado
                    </span>

                    <select
                        value={status}
                        onChange={(event) => applyFilter(setSearchParams, 'status', event.target.value)}
                        className="text_form_field w-full sm:w-[12rem]"
                    >
                        <option value="">Todos</option>

                        {TRIP_STATUSES.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Recolección desde
                    </span>

                    <input
                        type="date"
                        value={dateFrom}
                        onChange={(event) => applyFilter(setSearchParams, 'dateFrom', event.target.value)}
                        className="text_form_field"
                    />
                </label>

                <label className="flex flex-col gap-2">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Hasta
                    </span>

                    <input
                        type="date"
                        value={dateTo}
                        onChange={(event) => applyFilter(setSearchParams, 'dateTo', event.target.value)}
                        className="text_form_field"
                    />
                </label>
            </div>

            <p className="text-xs text-ink-subtle">
                Las dos fechas filtran por la recolección planificada e incluyen el día
                completo. El destino final no se puede filtrar: es texto libre.
            </p>
        </div>
    );
}
