/**
 * Delegado de búsqueda: escribe una dirección, elige una coincidencia y
 * devuelve el lugar ya resuelto —id de Google, dirección y coordenadas—.
 * Es el único punto del front que habla con `/api/places`.
 *
 * Cada pulsación no busca: cada llamada se factura contra la cuenta de Google,
 * así que el término se deja reposar y solo sale a buscar cuando el usuario
 * para de escribir.
 */

import type { Place, PlacePrediction } from "@/features/places/places";
import { PLACE_MIN_SEARCH_LENGTH, PLACE_SEARCH_DEBOUNCE_MS, placeProvider } from "@/features/places/places";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2, MapPin, Search } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
    label?: string;
    placeholder?: string;
    /** Recibe el lugar con sus coordenadas ya resueltas. */
    onSelect: (place: Place) => void;
    onError?: (message: string) => void;
    disabled?: boolean;
}

export function PlaceSearchField({
    label = "Buscar dirección",
    placeholder = "Bodega central, Escuintla",
    onSelect,
    onError,
    disabled = false
}: Props) {
    const [term, setTerm] = useState('');
    const [debounced, setDebounced] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => setDebounced(term.trim()), PLACE_SEARCH_DEBOUNCE_MS);

        return () => clearTimeout(timer);
    }, [term]);

    const isSearchable = debounced.length >= PLACE_MIN_SEARCH_LENGTH;

    const { data: predictions, isFetching, isError, error } = useQuery({
        queryKey: ['searchPlaces', debounced],
        queryFn: () => placeProvider.searchPlaces(debounced),
        enabled: isSearchable && !disabled
    });

    const { mutate: resolvePlace, isPending, variables } = useMutation({
        mutationFn: (prediction: PlacePrediction) => placeProvider.getPlaceById(prediction.id),
        onSuccess: (place) => {
            setTerm('');
            setDebounced('');
            onSelect(place);
        },
        onError: (err) => onError?.(err.message)
    });

    const results = predictions ?? [];

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="place-search">
                {label}
            </label>

            <div className="relative">
                <Search
                    size={16}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle"
                />

                <input
                    id="place-search"
                    type="text"
                    value={term}
                    disabled={disabled}
                    onChange={(event) => setTerm(event.target.value)}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="text_form_field !pl-9"
                />

                {(isFetching || isPending) && (
                    <Loader2
                        size={16}
                        className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-subtle"
                    />
                )}
            </div>

            {isSearchable && !isFetching && !isError && results.length === 0 && (
                <p className="text-xs text-ink-muted">
                    Ninguna dirección coincide con ese texto. Prueba con el nombre del lugar y el municipio.
                </p>
            )}

            {isError && (
                <p className="text-red-400 text-xs">{error.message}</p>
            )}

            {results.length > 0 && (
                <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-surface">
                    {results.map((prediction) => (
                        <li key={prediction.id}>
                            <button
                                type="button"
                                disabled={isPending}
                                onClick={() => resolvePlace(prediction)}
                                className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-canvas focus:outline-none focus-visible:bg-canvas disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <MapPin size={15} className="mt-0.5 shrink-0 text-ink-subtle" />

                                <span className="text-sm text-ink">{prediction.formattedAddress}</span>

                                {isPending && variables?.id === prediction.id && (
                                    <Loader2 size={14} className="ml-auto mt-0.5 shrink-0 animate-spin text-ink-subtle" />
                                )}
                            </button>
                        </li>
                    ))}
                </ul>
            )}

            {!isSearchable && term.trim().length > 0 && (
                <p className="text-xs text-ink-muted">
                    Escribe al menos {PLACE_MIN_SEARCH_LENGTH} caracteres para buscar.
                </p>
            )}
        </div>
    );
}
