/**
 * El combustible del viaje: cuánto le entregó la empresa transportista y
 * cuánto confirmó el piloto haber recibido.
 *
 * Las dos mitades del diálogo —el registro y el alta— están juntas a propósito,
 * porque **la lista es la que explica el número de arriba**. El total solo suma
 * lo confirmado, así que un viaje recién tomado enseña `0.00` teniendo ya una
 * carga registrada; enseñar el cero a secas parecería un fallo, y enseñarlo al
 * lado de su carga «pendiente de confirmar» se explica solo.
 *
 * La lista se lee como un libro de registro, no como una tabla de datos: el
 * orden es el de llegada, cada carga lleva su número de asiento y **el peso
 * visual de una fila es exactamente lo que aporta al total**. Lo confirmado va
 * en tinta plena sobre un filo sólido; lo pendiente, atenuado y sobre un filo
 * discontinuo. Ninguna fila se puede tachar: no existe editar ni borrar una
 * carga.
 *
 * De ahí el paso de confirmación antes de guardar. Un `450` en lugar de `45` es
 * permanente: no hay `PATCH`, no hay `DELETE`, los galones no admiten negativos
 * —así que ni siquiera se compensa con otra carga— y desde esta spec el total
 * decide si el viaje puede arrancar. Es la última pantalla donde el número se
 * puede corregir.
 */

import type { TripFuel, TripFuelForm, TripSummary } from "@/features/trips/trips";
import {
    TRIP_FINISHED_MESSAGE,
    TRIP_FUEL_FOREIGN_MESSAGE,
    TRIP_FUEL_NO_CARRIER_MESSAGE,
    TRIP_FUEL_TYPES,
    TRIP_FUEL_TYPE_LABELS,
    TripContainer,
    TripMoment,
    TripOrder,
    buildTripFuelPayload,
    canRegisterTripFuel,
    formatGallons,
    getTripFuelFieldErrors,
    sumPendingGallons,
    tripProvider
} from "@/features/trips/trips";
import { Modal, SelectFormField, SpinnerComponent, TextFormField, useNotification } from "@/features/shared/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { Fuel, TriangleAlert } from "lucide-react";

type Props = {
    /**
     * El viaje cuyas cargas se están mirando, o `null` con el diálogo cerrado.
     * Se abre desde el listado y desde la ficha, así que puede llegar recortado.
     */
    trip: TripSummary | null;
    /** Solo un `carrier` con empresa registrada puede añadir cargas. */
    canRegister: boolean;
    onClose: () => void;
}

export function TripFuelsModal({ trip, canRegister, onClose }: Props) {
    return (
        <Modal
            modal={Boolean(trip)}
            closeModal={onClose}
            title="Combustible del viaje"
            width="sm:max-w-3xl"
        >
            {/* La `key` descarta la carga a medio teclear al cambiar de viaje. */}
            {trip && <TripFuelsPanel key={trip.id} trip={trip} canRegister={canRegister} onClose={onClose} />}
        </Modal>
    );
}

type PanelProps = {
    trip: TripSummary;
    canRegister: boolean;
    onClose: () => void;
}

function TripFuelsPanel({ trip, canRegister, onClose }: PanelProps) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const tripId = trip.id.toString();

    /**
     * La carga tecleada esperando el sí definitivo, o `null` mientras se
     * teclea. Es el paso que separa un `45` de un `450`.
     */
    const [pendingLoad, setPendingLoad] = useState<TripFuelForm | null>(null);

    /**
     * Se pide sin `limit`: un viaje tiene un puñado de cargas, no las mil
     * posiciones del rastro. Los cuatro roles pueden leer esto, el piloto
     * asignado incluido.
     */
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getTripFuels', tripId],
        queryFn: () => tripProvider.getTripFuels(tripId)
    });

    const {
        control,
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<TripFuelForm>();

    const { mutate, isPending: isRegistering } = useMutation({
        mutationFn: (payload: TripFuelForm) => tripProvider.createTripFuel(tripId, payload),
        onSuccess: (message) => {
            notification.success(message);
            /** El viaje se recarga por su `totalFuelGallons`, que también cambia. */
            queryClient.invalidateQueries({ queryKey: ['getTripFuels', tripId] });
            queryClient.invalidateQueries({ queryKey: ['getTripById', tripId] });
            setPendingLoad(null);
            reset({ gallons: undefined, fuelType: undefined });
        },
        /**
         * Tres fallos no son del formulario y cierran el diálogo, porque
         * ninguno se arregla cambiando el número:
         *
         * - **El viaje no es de tu empresa**, o sigue en la bolsa (403). Sobre
         *   un viaje sin tomar el listado sí se lee, pero cargar no: una carga
         *   que ningún piloto puede confirmar nacería atascada.
         * - **Tu usuario no tiene empresa registrada** (403).
         * - **El viaje ya se cerró** (400). Se carga en `pending` y en
         *   `in_route`, nunca después.
         */
        onError: (err) => {
            const fieldErrors = getTripFuelFieldErrors(err);

            if (fieldErrors.length > 0) {
                fieldErrors.forEach(({ field, message }) => setError(field, { message }));
                setPendingLoad(null);
                return;
            }

            notification.error(err.message);
            setPendingLoad(null);

            const isBlocked = [
                TRIP_FUEL_FOREIGN_MESSAGE,
                TRIP_FUEL_NO_CARRIER_MESSAGE,
                TRIP_FINISHED_MESSAGE
            ].some((blocking) => err.message.startsWith(blocking));

            if (isBlocked) {
                queryClient.invalidateQueries({ queryKey: ['getTrips'] });
                queryClient.invalidateQueries({ queryKey: ['getTripById', tripId] });
                onClose();
            }
        }
    });

    const fuels = data?.data ?? [];
    const confirmedGallons = data?.totalGallons ?? "0.00";
    const pendingGallons = sumPendingGallons(fuels);
    const pendingCount = fuels.filter((fuel) => !fuel.isConfirmed).length;

    /** Sobre la bolsa libre y sobre un viaje cerrado el `POST` responde 403 y 400. */
    const canAddLoad = canRegister && canRegisterTripFuel(trip);

    const onSubmit = (values: TripFuelForm) => setPendingLoad(buildTripFuelPayload(values));

    return (
        <div className="flex flex-col gap-7">
            <header className="flex flex-col gap-5 rounded-xl bg-ink-deep px-5 py-5 text-canvas">
                <div className="flex flex-col gap-3">
                    <TripOrder order={trip.order} size="lg" />
                    <TripContainer container={trip.container} inverted />
                </div>

                {/* El total es la cifra que decide si el viaje puede arrancar: manda. */}
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-canvas/15 pt-5">
                    <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-canvas/50">
                            Galones confirmados
                        </span>

                        <span className="font-display text-4xl font-semibold tracking-tight tabular-nums">
                            {formatGallons(confirmedGallons)}
                        </span>
                    </div>

                    {pendingCount > 0 && (
                        <p className="max-w-[34ch] text-sm text-canvas/70">
                            Otros{' '}
                            <span className="font-mono tabular-nums text-canvas">
                                {formatGallons(pendingGallons)}
                            </span>{' '}
                            gal están registrados pero el piloto todavía no los confirma, así
                            que no suman aquí.
                        </p>
                    )}
                </div>
            </header>

            <p className="text-sm text-ink-muted">
                Solo cuentan los galones que el piloto confirmó haber recibido.
                Mientras no confirme ninguna carga, <span className="text-ink">no puede
                iniciar el viaje</span>. Cada carga queda registrada para siempre: no se
                puede corregir ni eliminar.
            </p>

            <section className="flex flex-col gap-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargas registradas
                </h3>

                {isLoading && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Cargando combustible
                    </p>
                )}

                {isError && (
                    <p className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
                        {error.message}
                    </p>
                )}

                {/* `data: []` no es un error: es un viaje al que nadie le ha cargado nada. */}
                {!isLoading && !isError && fuels.length === 0 && (
                    <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-sm text-ink-muted">
                        {canAddLoad
                            ? "Este viaje todavía no tiene combustible. Registra la primera carga abajo."
                            : "Este viaje todavía no tiene combustible registrado."}
                    </p>
                )}

                {fuels.length > 0 && (
                    <ol className="flex flex-col gap-2">
                        {fuels.map((fuel, index) => (
                            <TripFuelEntry key={fuel.id} fuel={fuel} index={index + 1} />
                        ))}
                    </ol>
                )}
            </section>

            {canAddLoad && (
                <section className="flex flex-col gap-4 border-t border-line pt-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                            Registrar una carga
                        </h3>

                        <p className="text-sm text-ink-muted">
                            Lo que le entregas al viaje ahora. Si recargas en carretera, añade
                            otra carga: se suman, no se reemplazan.
                        </p>
                    </div>

                    {pendingLoad ? (
                        <TripFuelConfirmation
                            load={pendingLoad}
                            isPending={isRegistering}
                            onBack={() => setPendingLoad(null)}
                            onConfirm={() => mutate(pendingLoad)}
                        />
                    ) : (
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            noValidate
                            className="flex flex-col gap-4"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <TextFormField<TripFuelForm>
                                    label="Galones"
                                    name="gallons"
                                    type="number"
                                    placeholder="45.50"
                                    register={register}
                                    errorMessage={errors.gallons?.message}
                                    validation={{
                                        required: "Los galones son obligatorios",
                                        valueAsNumber: true,
                                        min: {
                                            value: 0.01,
                                            message: "Los galones deben ser mayores a 0"
                                        }
                                    }}
                                />

                                <SelectFormField<TripFuelForm>
                                    label="Tipo de combustible"
                                    name="fuelType"
                                    options={TRIP_FUEL_TYPES}
                                    control={control}
                                    errorMessage={errors.fuelType?.message}
                                    validation={{ required: "El tipo de combustible es obligatorio" }}
                                />
                            </div>

                            <div className="flex flex-wrap justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                                >
                                    Cerrar
                                </button>

                                <button
                                    type="submit"
                                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink-deep px-4 py-2 text-sm font-semibold text-canvas shadow-sm transition-all duration-200 hover:bg-ink active:scale-[0.98] focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                                >
                                    <Fuel size={16} />
                                    Registrar la carga
                                </button>
                            </div>
                        </form>
                    )}
                </section>
            )}

            {!canAddLoad && (
                <div className="flex justify-end border-t border-line pt-6">
                    <button
                        type="button"
                        onClick={onClose}
                        className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                    >
                        Cerrar
                    </button>
                </div>
            )}
        </div>
    );
}

type EntryProps = {
    fuel: TripFuel;
    /** El número de asiento: el orden es el de registro y la API lo garantiza. */
    index: number;
}

/**
 * Una línea del registro. Lo confirmado pesa y lo pendiente no, así que se
 * pintan con pesos distintos: es la misma diferencia que hay entre sumar al
 * total y no sumar.
 */
function TripFuelEntry({ fuel, index }: EntryProps) {
    return (
        <li
            className={[
                "flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-lg border-l-2 bg-canvas py-3 pr-4 pl-4",
                fuel.isConfirmed
                    ? "border-l-success"
                    : "border-l-line-strong border-dashed"
            ].join(' ')}
        >
            <span className="font-mono text-[10px] tabular-nums tracking-[0.18em] text-ink-subtle">
                {index.toString().padStart(2, '0')}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span
                        className={`font-mono text-[15px] tabular-nums ${fuel.isConfirmed ? "text-ink" : "text-ink-muted"}`}
                    >
                        {formatGallons(fuel.gallons)} gal
                    </span>

                    <span className="text-sm text-ink-muted">
                        {TRIP_FUEL_TYPE_LABELS[fuel.fuelType] ?? fuel.fuelType}
                    </span>
                </div>

                <p className="text-xs text-ink-subtle">
                    Registró {fuel.registeredByName}
                    {fuel.confirmedByName && ` · Confirmó ${fuel.confirmedByName}`}
                </p>
            </div>

            {fuel.isConfirmed ? (
                <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-success">
                        Confirmada
                    </span>

                    <TripMoment value={fuel.loadedAt} withTime />
                </div>
            ) : (
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Sin confirmar
                </span>
            )}
        </li>
    );
}

type ConfirmationProps = {
    load: TripFuelForm;
    isPending: boolean;
    onBack: () => void;
    onConfirm: () => void;
}

/**
 * El último punto donde el número se puede corregir. Se repite la cifra en
 * grande porque es exactamente el error que se busca atrapar: un cero de más
 * pasa desapercibido en un campo y no en un titular.
 */
function TripFuelConfirmation({ load, isPending, onBack, onConfirm }: ConfirmationProps) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-line-strong bg-canvas px-5 py-5">
            <div className="flex items-start gap-3">
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />

                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-ink">
                        Revisa la cantidad antes de guardar
                    </p>

                    <p className="text-sm text-ink-muted">
                        Una carga registrada no se puede corregir ni eliminar, y suma al
                        total del viaje en cuanto el piloto la confirme.
                    </p>
                </div>
            </div>

            <p className="font-display text-3xl font-semibold tracking-tight tabular-nums text-ink">
                {formatGallons(load.gallons)}
                <span className="ml-2 font-sans text-base font-normal text-ink-muted">
                    gal de {TRIP_FUEL_TYPE_LABELS[load.fuelType] ?? load.fuelType}
                </span>
            </p>

            <div className="flex flex-wrap justify-end gap-3">
                <button
                    type="button"
                    onClick={onBack}
                    disabled={isPending}
                    className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    Corregir
                </button>

                <button
                    type="button"
                    onClick={onConfirm}
                    disabled={isPending}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink-deep px-4 py-2 text-sm font-semibold text-canvas shadow-sm transition-all duration-200 hover:bg-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-subtle disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                >
                    {isPending ? <SpinnerComponent /> : `Registrar ${formatGallons(load.gallons)} gal`}
                </button>
            </div>
        </div>
    );
}
