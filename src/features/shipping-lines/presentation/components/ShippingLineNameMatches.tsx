/**
 * La defensa del catálogo, y la única que hay: con un solo campo libre y sin
 * código, `MAERSK LNE` es tan válida como `MAERSK LINE` y nada en el servidor
 * lo detecta. Una errata no da error, crea una naviera nueva.
 *
 * Por eso el formulario busca mientras se escribe: lo que ya está en el
 * catálogo aparece bajo el campo antes de enviar nada. Distingue dos casos que
 * el usuario no puede confundir:
 *
 * - **Coincidencia exacta** (ya normalizada como la guarda el backend): el alta
 *   va a responder 400. Se dice antes, y se ofrece su ficha.
 * - **Nombres parecidos**: no bloquean nada, solo se muestran para que quien
 *   escribe vea si está a punto de duplicar una naviera que ya existe.
 *
 * Un nombre ocupado también puede ser el de una naviera **borrada**, invisible
 * en todos los endpoints: entonces esta búsqueda no la encuentra y el 400 llega
 * igual. Es el límite de la API, y el mensaje del error lo explica.
 */

import { normalizeShippingLineName, shippingLineProvider } from "@/features/shipping-lines/shipping-lines";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";

/** Se espera a que el usuario deje de teclear antes de consultar. */
const MATCH_DEBOUNCE_MS = 400;

/** Con una sola letra el listado no dice nada útil: medio catálogo coincide. */
const MIN_TERM_LENGTH = 3;

/** El backend acota el `limit` a un mínimo de 10; pedir menos no reduce nada. */
const MATCH_LIMIT = '10';

type Props = {
    /** Lo que hay escrito en el campo, sin normalizar. */
    term: string;
    /** En la edición, la propia naviera no es un duplicado de sí misma. */
    excludeId?: number;
}

export function ShippingLineNameMatches({ term, excludeId }: Props) {
    const normalized = normalizeShippingLineName(term);
    const [debouncedTerm, setDebouncedTerm] = useState(normalized);

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedTerm(normalized), MATCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [normalized]);

    const isSearchable = debouncedTerm.length >= MIN_TERM_LENGTH;

    const { data, isFetching } = useQuery({
        queryKey: ['getShippingLines', 'matches', debouncedTerm],
        queryFn: () => shippingLineProvider.getShippingLines(MATCH_LIMIT, '0', { search: debouncedTerm }),
        enabled: isSearchable,
        /** El catálogo se mueve poco: no hace falta repetir la consulta al volver. */
        staleTime: 60_000
    });

    if (!isSearchable) return null;

    const matches = (data?.data ?? []).filter((line) => line.id !== excludeId);
    const exact = matches.find((line) => line.name === debouncedTerm);
    const similar = matches.filter((line) => line.name !== debouncedTerm);

    /** Solo mientras no haya nada que mostrar todavía: después manda el resultado. */
    if (isFetching && !data) {
        return (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Buscando en el catálogo
            </p>
        );
    }

    if (exact) {
        return (
            <div className="flex flex-col gap-2 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3.5">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-danger">
                    Ese nombre ya está en el catálogo
                </span>

                <p className="text-sm text-ink-muted">
                    <span className="font-display font-semibold uppercase text-ink">{exact.name}</span>{' '}
                    ya existe. El alta responderá con un error: el nombre es único y no se
                    puede repetir.
                </p>

                <Link
                    to={`/navieras/${exact.id}`}
                    className="w-fit font-mono text-[11px] uppercase tracking-[0.18em] text-ink underline underline-offset-4 transition-colors hover:text-ink-deep focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    Ver la naviera
                </Link>
            </div>
        );
    }

    if (similar.length === 0) {
        return (
            <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Ningún nombre parecido en el catálogo
            </p>
        );
    }

    return (
        <div className="flex flex-col gap-2.5 rounded-xl border border-line bg-canvas px-4 py-3.5">
            <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                Parecidas en el catálogo
            </span>

            <ul className="flex flex-col gap-1.5">
                {similar.map((line) => (
                    <li key={line.id}>
                        <Link
                            to={`/navieras/${line.id}`}
                            className="font-display text-sm font-semibold uppercase tracking-tight text-ink underline-offset-4 transition-colors hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            {line.name}
                        </Link>
                    </li>
                ))}
            </ul>

            <p className="text-sm text-ink-muted">
                Comprueba que no sea una de estas escrita de otra forma: una errata no da
                error, da una naviera repetida.
            </p>
        </div>
    );
}
