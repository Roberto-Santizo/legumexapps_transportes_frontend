/**
 * La orden del viaje y, si existe, el packing list que hay detrás.
 *
 * El campo no busca mientras se teclea: la coincidencia es **exacta y sensible
 * a mayúsculas**, así que buscar en cada pulsación solo encadenaría 404. Se
 * busca al pulsar el botón o Enter.
 *
 * Que la orden no aparezca **no es un error**: el packing list puede no estar
 * cargado todavía y el viaje se tiene que poder publicar igual, rellenando el
 * destino y el contenedor a mano. Por eso el "no encontrada" se pinta como un
 * aviso y no como un fallo, y el input nunca se bloquea.
 */

import type { PackingListSummary } from "@/features/packing-lists/packing-lists";
import {
    formatPackingListCount,
    formatPackingListWeight,
    hasPackingListBottles,
    packingListProvider,
    packingListTypeLabel
} from "@/features/packing-lists/packing-lists";
import { Table, Tbody, Td, Th, Thead, Tr } from "@/features/shared/shared";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { useState } from "react";

type Props = {
    order: string;
    onOrderChange: (order: string) => void;
    /** Recibe el resumen ya resuelto: producto o jugo, el consumidor no elige. */
    onSummaryFound: (summary: PackingListSummary) => void;
    onError?: (message: string) => void;
    errorMessage?: string;
    disabled?: boolean;
};

/** Sin dato: las botellas solo existen en los jugos. */
const EMPTY_CELL = "—";

function SummarySlip({ summary }: { summary: PackingListSummary }) {
    const withBottles = hasPackingListBottles(summary);

    return (
        <div className="flex flex-col gap-3">
            <div className="rounded-2xl border border-line bg-canvas px-5 py-4">
                <p className="font-display text-lg font-semibold tracking-tight text-ink">
                    {summary.order}
                </p>

                <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-muted">
                    {summary.client} · {packingListTypeLabel(summary)}
                </p>
            </div>

            {summary.products.length === 0 && (
                <p className="text-xs text-ink-muted">
                    El packing list existe pero no tiene items. El destino y el contenedor
                    sí se rellenaron.
                </p>
            )}

            {summary.products.length > 0 && (
                <Table>
                    <Thead>
                        <Th text="Producto" />
                        <Th text="Cajas" />
                        <Th text="Peso bruto" />
                        <Th text="Peso neto" />
                        {withBottles && <Th text="Botellas" />}
                    </Thead>

                    <Tbody>
                        {summary.products.map((row) => (
                            <Tr key={row.product}>
                                <Td className="text-ink">{row.product}</Td>
                                <Td>{formatPackingListCount(row.totalBoxes)}</Td>
                                <Td>{formatPackingListWeight(row.grossWeight)}</Td>
                                <Td>{formatPackingListWeight(row.netWeight)}</Td>
                                {withBottles && (
                                    <Td>
                                        {row.bottles === undefined
                                            ? EMPTY_CELL
                                            : formatPackingListCount(row.bottles)}
                                    </Td>
                                )}
                            </Tr>
                        ))}

                        <Tr>
                            <Td className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink">
                                Total
                            </Td>
                            <Td className="font-semibold text-ink">
                                {formatPackingListCount(summary.totals.totalBoxes)}
                            </Td>
                            <Td className="font-semibold text-ink">
                                {formatPackingListWeight(summary.totals.grossWeight)}
                            </Td>
                            <Td className="font-semibold text-ink">
                                {formatPackingListWeight(summary.totals.netWeight)}
                            </Td>
                            {withBottles && (
                                <Td className="font-semibold text-ink">
                                    {summary.totals.bottles === undefined
                                        ? EMPTY_CELL
                                        : formatPackingListCount(summary.totals.bottles)}
                                </Td>
                            )}
                        </Tr>
                    </Tbody>
                </Table>
            )}
        </div>
    );
}

export function PackingListSummaryField({
    order,
    onOrderChange,
    onSummaryFound,
    onError,
    errorMessage,
    disabled = false
}: Props) {
    const [summary, setSummary] = useState<PackingListSummary | null>(null);
    const [notFound, setNotFound] = useState(false);
    const [searchError, setSearchError] = useState('');

    const { mutate: search, isPending } = useMutation({
        mutationFn: (value: string) => packingListProvider.getSummaryByOrder(value),
        onSuccess: (found) => {
            setNotFound(found === null);
            setSummary(found);

            if (found) onSummaryFound(found);
        },
        onError: (err) => {
            setSearchError(err.message);
            onError?.(err.message);
        }
    });

    const term = order.trim();
    const canSearch = term.length > 0 && !isPending && !disabled;

    /** Un resumen que ya no corresponde a lo tecleado mentiría sobre el relleno. */
    const handleChange = (value: string) => {
        setSummary(null);
        setNotFound(false);
        setSearchError('');
        onOrderChange(value);
    };

    const handleSearch = () => {
        if (!canSearch) return;

        setSearchError('');
        search(term);
    };

    return (
        <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-gray-700" htmlFor="trip-order">
                Orden
            </label>

            <div className="flex items-start gap-2">
                <input
                    id="trip-order"
                    type="text"
                    value={order}
                    disabled={disabled}
                    onChange={(event) => handleChange(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key !== 'Enter') return;

                        /* El formulario no se envía desde aquí: Enter busca. */
                        event.preventDefault();
                        handleSearch();
                    }}
                    placeholder="ORD-2026 0148"
                    autoComplete="off"
                    className={errorMessage ? 'text_form_field_error' : 'text_form_field'}
                />

                <button
                    type="button"
                    onClick={handleSearch}
                    disabled={!canSearch}
                    className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2.5 text-sm font-semibold text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {isPending
                        ? <Loader2 size={15} className="animate-spin" />
                        : <Search size={15} />}

                    Buscar
                </button>
            </div>

            {errorMessage && <p className="text-red-400 text-xs">{errorMessage}</p>}

            {searchError && <p className="text-red-400 text-xs">{searchError}</p>}

            {notFound && (
                <p className="text-xs text-ink-muted">
                    No se encontró un packing list con esa orden. Puedes publicar el viaje
                    llenando el destino y el contenedor a mano.
                </p>
            )}

            {!summary && !notFound && !searchError && (
                <p className="text-xs text-ink-muted">
                    Busca la orden para traer el destino y el contenedor del packing list.
                </p>
            )}

            {summary && <SummarySlip summary={summary} />}
        </div>
    );
}
