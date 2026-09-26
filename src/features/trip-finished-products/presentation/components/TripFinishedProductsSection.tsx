/**
 * Lo que va dentro del contenedor, caja por caja. Se lee como un manifiesto de
 * carga: cada línea es un SKU del cliente con sus cajas, y **la parte de la
 * carga es el peso de la fila** —la barra mide las cajas de la línea contra el
 * total del viaje—, así que el producto que llena el contenedor se ve de lejos.
 *
 * Totales y tarimas los calcula el front: la API no los da. Las tarimas son
 * `cajas / cajas por tarima` y no se redondean, porque media tarima es una
 * tarima incompleta, no un error.
 *
 * Se escribe solo con el viaje en `pending` y con rol de publicador. Un viaje
 * nunca se queda sin líneas: la última no se puede quitar.
 */

import type { TripFinishedProduct } from "@/features/trip-finished-products/trip-finished-products";
import {
    TripFinishedProductFormModal,
    canWriteTripFinishedProducts,
    formatTripBoxes,
    formatTripFinishedProductMoment,
    formatTripPallets,
    formatTripProductDecimal,
    isTripFinishedProductsEditable,
    sumTripBoxes,
    sumTripPallets,
    tripFinishedProductProvider,
    tripLinePallets
} from "@/features/trip-finished-products/trip-finished-products";
import { useNotification } from "@/features/shared/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useState } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import type { RootState } from "@/config/store/store";

type Props = {
    tripId: number;
    clientId: number;
    /** Cadena cruda del enum del viaje: solo `pending` admite escrituras. */
    tripStatus: string;
}

export function TripFinishedProductsSection({ tripId, clientId, tripStatus }: Props) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteTripFinishedProducts(role) && isTripFinishedProductsEditable(tripStatus);

    /** `undefined` = cerrado, `null` = alta, línea = edición de cajas. */
    const [editing, setEditing] = useState<TripFinishedProduct | null | undefined>(undefined);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getTripFinishedProducts', tripId.toString()],
        queryFn: () => tripFinishedProductProvider.getTripFinishedProducts(tripId.toString())
    });

    const lines = data ?? [];
    const totalBoxes = sumTripBoxes(lines);
    const totalPallets = sumTripPallets(lines);
    const isLastLine = lines.length <= 1;

    const { mutate: remove, isPending: isRemoving } = useMutation({
        mutationFn: (id: string) => tripFinishedProductProvider.deleteTripFinishedProductById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getTripFinishedProducts', tripId.toString()] });
        },
        onError: (err) => notification.error(err.message)
    });

    const confirmRemove = (line: TripFinishedProduct) => {
        notification.question(
            `Quitar ${line.name}`,
            "Quitar",
            `${formatTripBoxes(line.boxes)} cajas de ${line.code}. La línea se borra del viaje y no se puede restaurar.`,
            () => remove(line.id.toString())
        );
    };

    return (
        <section className="flex flex-col gap-5 rounded-2xl border border-line bg-surface p-6">
            <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
                <div className="flex flex-col gap-1">
                    <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                        Productos terminados
                    </h2>

                    <p className="max-w-[62ch] text-sm text-ink-muted">
                        Las cajas de cada producto del cliente que lleva el viaje. Código,
                        nombre y cajas por tarima se leen del catálogo en vivo.
                    </p>
                </div>

                {canWrite && (
                    <button
                        type="button"
                        onClick={() => setEditing(null)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                    >
                        <Plus size={15} aria-hidden />
                        Agregar producto
                    </button>
                )}
            </div>

            {isLoading && (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Cargando productos
                </p>
            )}

            {isError && (
                <p className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
                    {error.message}
                </p>
            )}

            {/* Vacío no es un error: es un viaje publicado antes de que se registraran productos. */}
            {!isLoading && !isError && lines.length === 0 && (
                <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-sm text-ink-muted">
                    Este viaje se publicó sin productos terminados.
                    {canWrite && " Agrega el primero para registrar lo que lleva."}
                </p>
            )}

            {lines.length > 0 && (
                <>
                    <dl className="flex flex-wrap gap-x-10 gap-y-4 border-t border-line pt-5">
                        <Figure label="Cajas" value={formatTripBoxes(totalBoxes)} />
                        <Figure label="Tarimas" value={formatTripPallets(totalPallets)} />
                        <Figure label="Productos" value={lines.length.toString()} />
                    </dl>

                    <ol className="flex flex-col">
                        {lines.map((line) => (
                            <TripFinishedProductRow
                                key={line.id}
                                line={line}
                                totalBoxes={totalBoxes}
                                canWrite={canWrite}
                                canRemove={!isLastLine && !isRemoving}
                                onEdit={() => setEditing(line)}
                                onRemove={() => confirmRemove(line)}
                            />
                        ))}
                    </ol>

                    {canWrite && isLastLine && (
                        <p className="text-xs text-ink-subtle">
                            Un viaje no puede quedarse sin productos. Para cambiar el único que
                            lleva, agrega el nuevo y luego quita este.
                        </p>
                    )}

                    {!isTripFinishedProductsEditable(tripStatus) && (
                        <p className="text-xs text-ink-subtle">
                            Los productos solo se modifican mientras el viaje está pendiente.
                        </p>
                    )}
                </>
            )}

            <TripFinishedProductFormModal
                open={editing !== undefined}
                tripId={tripId}
                clientId={clientId}
                line={editing}
                existingProductIds={lines.map((line) => line.finishedProductId)}
                onClose={() => setEditing(undefined)}
            />
        </section>
    );
}

type FigureProps = {
    label: string;
    value: string;
}

function Figure({ label, value }: FigureProps) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </dt>

            <dd className="font-display text-2xl font-semibold tracking-tight tabular-nums text-ink">
                {value}
            </dd>
        </div>
    );
}

type RowProps = {
    line: TripFinishedProduct;
    /** La escala de la barra: la carga entera del viaje. */
    totalBoxes: number;
    canWrite: boolean;
    canRemove: boolean;
    onEdit: () => void;
    onRemove: () => void;
}

function TripFinishedProductRow({ line, totalBoxes, canWrite, canRemove, onEdit, onRemove }: RowProps) {
    const pallets = tripLinePallets(line.boxes, line.boxesPerPallet);
    const share = totalBoxes > 0 ? Math.max(2, (line.boxes / totalBoxes) * 100) : 2;

    return (
        <li className="grid grid-cols-1 gap-x-5 gap-y-2 border-t border-line py-4 sm:grid-cols-[1fr_auto] sm:items-center">
            <div className="flex min-w-0 flex-col gap-2">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5">
                    <span className="font-mono text-[12px] uppercase tracking-[0.14em] text-ink-muted">
                        {line.code}
                    </span>

                    <span className="text-sm font-medium text-ink">{line.name}</span>
                </div>

                <div className="h-1.5 w-full rounded-full bg-canvas">
                    <div style={{ width: `${share}%` }} className="h-full rounded-full bg-ink-deep" />
                </div>

                <span className="text-xs text-ink-subtle">
                    Presentación {formatTripProductDecimal(line.presentation)} ·{' '}
                    {formatTripProductDecimal(line.boxesPerPallet)} cajas por tarima ·{' '}
                    {line.registeredByName ?? "Sin registro"}, {formatTripFinishedProductMoment(line.createdAt)}
                </span>
            </div>

            <div className="flex items-center gap-4 sm:justify-end">
                <div className="flex flex-col gap-0.5 sm:items-end">
                    <span className="font-mono text-[15px] tabular-nums text-ink">
                        {formatTripBoxes(line.boxes)} cajas
                    </span>

                    <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ink-subtle">
                        {formatTripPallets(pallets)} tarimas
                    </span>
                </div>

                {canWrite && (
                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onEdit}
                            aria-label={`Corregir cajas de ${line.name}`}
                            title="Corregir cajas"
                            className="cursor-pointer rounded-md p-2 text-ink-muted transition-colors hover:bg-canvas hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            <Pencil size={15} />
                        </button>

                        <button
                            type="button"
                            onClick={onRemove}
                            disabled={!canRemove}
                            aria-label={`Quitar ${line.name}`}
                            title={canRemove ? "Quitar del viaje" : "El viaje debe tener al menos un producto"}
                            className="cursor-pointer rounded-md p-2 text-danger transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/20 disabled:cursor-not-allowed disabled:text-ink-subtle/50 disabled:hover:bg-transparent"
                        >
                            <Trash2 size={15} />
                        </button>
                    </div>
                )}
            </div>
        </li>
    );
}
