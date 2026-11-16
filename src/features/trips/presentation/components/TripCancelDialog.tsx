/**
 * Cancelar un viaje (SPEC 42), que **no es borrarlo**: el viaje sigue en el
 * listado, el detalle, el tablero y el Excel con su tripulación, sus cargas y
 * sus viáticos, pero queda de solo lectura y no vuelve a la bolsa. Borrar es
 * para el viaje creado por error; cancelar, para el viaje real que no se hará.
 *
 * Es **irreversible** —no hay «descancelar»—, así que el diálogo lo dice. No se
 * pide teclear la orden como en la baja: aquí no se pierde nada, solo se cierra.
 * Los botones evitan un «Cancelar» a secas, que aquí sería ambiguo.
 */

import type { TripSummary } from "@/features/trips/trips";
import { TripContainer, TripOrder, TripRouteLine } from "@/features/trips/trips";
import { Modal, SpinnerComponent } from "@/features/shared/shared";
import { Ban } from "lucide-react";

type Props = {
    /** El viaje a cancelar, o `null` con el diálogo cerrado. Sirve la fila del listado. */
    trip: TripSummary | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function TripCancelDialog({ trip, isPending, onClose, onConfirm }: Props) {
    return (
        <Modal
            modal={Boolean(trip)}
            closeModal={onClose}
            title="Cancelar viaje"
            width="sm:max-w-lg"
        >
            {trip && (
                <div className="flex flex-col gap-6">
                    <div className="flex flex-col gap-3 rounded-xl bg-ink-deep px-5 py-4 text-canvas">
                        <TripOrder order={trip.order} size="lg" />
                        <TripContainer container={trip.container} inverted />
                    </div>

                    <div className="flex flex-col gap-3">
                        <TripRouteLine
                            departurePointName={trip.departurePointName}
                            locationName={trip.locationName}
                            destination={trip.destination}
                        />

                        <p className="text-sm text-ink-muted">
                            El viaje queda como <span className="text-ink">cancelado</span> y se
                            sigue viendo en el listado y en el detalle, pero ya no se puede editar,
                            asignar, iniciar ni registrarle cargas, viáticos, gastos o productos.
                        </p>

                        {trip.pilotName && (
                            <p className="text-sm text-ink-muted">
                                <span className="text-ink">{trip.pilotName}</span>
                                {trip.vehiclePlate && <> con la unidad <span className="font-mono text-[13px] text-ink">{trip.vehiclePlate}</span></>}{' '}
                                se queda registrado en el viaje y recibirá un aviso en su aplicación.
                                El viaje no vuelve a la bolsa.
                            </p>
                        )}

                        <p className="flex items-start gap-2.5 rounded-xl border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-ink">
                            <Ban size={15} aria-hidden className="mt-0.5 shrink-0 text-danger" />
                            No se puede deshacer. Si el viaje vuelve a hacerse, habrá que publicarlo de nuevo.
                        </p>
                    </div>

                    <div className="flex flex-wrap justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            Volver
                        </button>

                        <button
                            type="button"
                            onClick={onConfirm}
                            disabled={isPending}
                            className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-danger/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-danger/40 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                        >
                            {isPending ? <SpinnerComponent /> : "Cancelar viaje"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}
