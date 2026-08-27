/**
 * La baja de un viaje, que en este dominio es de verdad irreversible: no hay
 * `/restore`, no hay `?trashed=true` y ningún endpoint vuelve a alcanzar la
 * fila. Recuperarla exige entrar a la base de datos.
 *
 * Y es, además, la **única salida** cuando un viaje se atasca: el
 * administrador no puede asignar, nadie puede desasignar, y un viaje que nadie
 * toma —o que tomó la empresa equivocada— no se arregla, se borra y se vuelve a
 * publicar. Por eso el diálogo lo dice en lugar de limitarse a preguntar
 * «¿seguro?».
 *
 * Hay que teclear la orden para confirmar. La orden **no es única**, así que no
 * identifica el viaje por sí sola: lo que hace es obligar a mirar la ficha antes
 * de borrarla.
 */

import type { Trip } from "@/features/trips/trips";
import { TripContainer, TripOrder, TripRouteLine } from "@/features/trips/trips";
import { Modal, SpinnerComponent } from "@/features/shared/shared";
import { useState } from "react";

type Props = {
    /** El viaje a borrar, o `null` con el diálogo cerrado. */
    trip: Trip | null;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function TripDeleteDialog({ trip, isPending, onClose, onConfirm }: Props) {
    return (
        <Modal
            modal={Boolean(trip)}
            closeModal={onClose}
            title="Eliminar viaje"
            width="sm:max-w-lg"
        >
            {trip && (
                /** La `key` reinicia lo tecleado al cambiar de viaje. */
                <TripDeleteConfirmation
                    key={trip.id}
                    trip={trip}
                    isPending={isPending}
                    onClose={onClose}
                    onConfirm={onConfirm}
                />
            )}
        </Modal>
    );
}

type ConfirmationProps = {
    trip: Trip;
    isPending: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

const normalize = (value: string): string => value.trim().toUpperCase().replace(/\s+/g, ' ');

function TripDeleteConfirmation({ trip, isPending, onClose, onConfirm }: ConfirmationProps) {
    const [typedOrder, setTypedOrder] = useState('');

    /** Se compara ya normalizada: importa la orden, no cómo se teclee. */
    const matches = normalize(typedOrder) === normalize(trip.order);

    const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        if (matches && !isPending) onConfirm();
    };

    return (
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
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
                    El viaje desaparece del listado y del detalle para todos los roles, y no
                    hay forma de restaurarlo desde la aplicación.
                </p>

                {trip.pilotName && (
                    <p className="text-sm text-ink-muted">
                        Está asignado a <span className="text-ink">{trip.pilotName}</span>
                        {trip.vehiclePlate && <> en la unidad <span className="font-mono text-[13px] text-ink">{trip.vehiclePlate}</span></>}.
                        No recibirá ningún aviso: el dominio no manda notificaciones.
                    </p>
                )}

                <p className="text-sm text-ink-muted">
                    Si lo que quieres es volver a publicarlo, tendrás que capturarlo de
                    nuevo: borrar es la única forma de devolver un viaje a la bolsa.
                </p>
            </div>

            <label className="flex flex-col gap-2">
                <span className="text-sm font-medium text-gray-700">
                    Escribe <span className="font-mono uppercase text-ink">{trip.order}</span> para confirmar
                </span>

                <input
                    type="text"
                    value={typedOrder}
                    onChange={(event) => setTypedOrder(event.target.value)}
                    placeholder={trip.order}
                    autoComplete="off"
                    autoFocus
                    className="text_form_field font-mono uppercase"
                />
            </label>

            <div className="flex flex-wrap justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    disabled={!matches || isPending}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-danger/90 active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-danger/40 disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                >
                    {isPending ? <SpinnerComponent /> : "Eliminar viaje"}
                </button>
            </div>
        </form>
    );
}
