/**
 * Los viáticos del viaje: cuánto dinero le entregó la empresa transportista al
 * piloto y cuánto confirmó él haber recibido.
 *
 * Es el calco del diálogo de combustible con quetzales en vez de galones, y
 * por la misma razón las dos mitades —el registro y el alta— van juntas: **la
 * lista es la que explica el número de arriba**. El total solo suma lo
 * confirmado, así que un viaje recién tomado con viático enseña `Q0.00`
 * teniendo ya uno registrado; al lado de su fila «sin confirmar» el cero se
 * explica solo.
 *
 * La lista se lee como un libro de caja: el orden es el de registro, cada
 * viático lleva su número de asiento y el peso visual de una fila es lo que
 * aporta al total. Lo confirmado va en tinta plena sobre un filo sólido; lo
 * pendiente, atenuado y sobre un filo discontinuo. Ninguna fila se puede
 * tachar: no existe editar ni borrar un viático.
 *
 * De ahí el paso de confirmación antes de guardar. Un `3500` en lugar de `350`
 * es permanente: no hay `PATCH`, no hay `DELETE` y no se desconfirma. A
 * diferencia del combustible, el viático **no bloquea el arranque** del viaje.
 */

import type { TripExpense, TripExpenseForm, TripSummary } from "@/features/trips/trips";
import {
    TRIP_EXPENSE_FOREIGN_MESSAGE,
    TRIP_EXPENSE_MAX_AMOUNT,
    TRIP_FINISHED_MESSAGE,
    TRIP_FUEL_NO_CARRIER_MESSAGE,
    TRIP_TEXT_MAX_LENGTH,
    TripContainer,
    TripMoment,
    TripOrder,
    buildTripExpensePayload,
    canRegisterTripExpense,
    formatAmount,
    getTripExpenseFieldErrors,
    sumPendingAmount,
    tripProvider
} from "@/features/trips/trips";
import { Modal, SpinnerComponent, TextAreaFormField, TextFormField, useNotification } from "@/features/shared/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { TriangleAlert, Wallet } from "lucide-react";

type Props = {
    /**
     * El viaje cuyos viáticos se están mirando, o `null` con el diálogo
     * cerrado. Se abre desde el listado y desde la ficha, así que puede llegar
     * recortado.
     */
    trip: TripSummary | null;
    /** Solo un `carrier` con empresa registrada puede añadir viáticos. */
    canRegister: boolean;
    onClose: () => void;
}

export function TripExpensesModal({ trip, canRegister, onClose }: Props) {
    return (
        <Modal
            modal={Boolean(trip)}
            closeModal={onClose}
            title="Viáticos del viaje"
            width="sm:max-w-3xl"
        >
            {/* La `key` descarta el viático a medio teclear al cambiar de viaje. */}
            {trip && <TripExpensesPanel key={trip.id} trip={trip} canRegister={canRegister} onClose={onClose} />}
        </Modal>
    );
}

type PanelProps = {
    trip: TripSummary;
    canRegister: boolean;
    onClose: () => void;
}

function TripExpensesPanel({ trip, canRegister, onClose }: PanelProps) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const tripId = trip.id.toString();

    /**
     * El viático tecleado esperando el sí definitivo, o `null` mientras se
     * teclea. Es el paso que separa un `350` de un `3500`.
     */
    const [pendingExpense, setPendingExpense] = useState<TripExpenseForm | null>(null);

    /**
     * Se pide sin `limit`: un viaje tiene un puñado de viáticos. Los cuatro
     * roles pueden leer esto, el piloto asignado incluido.
     */
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getTripExpenses', tripId],
        queryFn: () => tripProvider.getTripExpenses(tripId)
    });

    const {
        register,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<TripExpenseForm>();

    const { mutate, isPending: isRegistering } = useMutation({
        mutationFn: (payload: TripExpenseForm) => tripProvider.createTripExpense(tripId, payload),
        onSuccess: (message) => {
            notification.success(message);
            /** El viaje se recarga por su `totalExpensesAmount`, que también cambia. */
            queryClient.invalidateQueries({ queryKey: ['getTripExpenses', tripId] });
            queryClient.invalidateQueries({ queryKey: ['getTripById', tripId] });
            setPendingExpense(null);
            reset({ amount: undefined, description: '' });
        },
        /**
         * Tres fallos no son del formulario y cierran el diálogo, porque
         * ninguno se arregla cambiando el monto:
         *
         * - **El viaje no es de tu empresa**, o sigue en la bolsa (403).
         * - **Tu usuario no tiene empresa registrada** (403).
         * - **El viaje ya se cerró** (400). Se registra en `pending` y en
         *   `in_route`, nunca después.
         */
        onError: (err) => {
            const fieldErrors = getTripExpenseFieldErrors(err);

            if (fieldErrors.length > 0) {
                fieldErrors.forEach(({ field, message }) => setError(field, { message }));
                setPendingExpense(null);
                return;
            }

            notification.error(err.message);
            setPendingExpense(null);

            const isBlocked = [
                TRIP_EXPENSE_FOREIGN_MESSAGE,
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

    const expenses = data?.data ?? [];
    const confirmedAmount = data?.totalAmount ?? "0.00";
    const pendingAmount = sumPendingAmount(expenses);
    const pendingCount = expenses.filter((expense) => !expense.isConfirmed).length;

    /** Sobre la bolsa libre y sobre un viaje cerrado el `POST` responde 403 y 400. */
    const canAddExpense = canRegister && canRegisterTripExpense(trip);

    const onSubmit = (values: TripExpenseForm) => setPendingExpense(buildTripExpensePayload(values));

    return (
        <div className="flex flex-col gap-7">
            <header className="flex flex-col gap-5 rounded-xl bg-ink-deep px-5 py-5 text-canvas">
                <div className="flex flex-col gap-3">
                    <TripOrder order={trip.order} size="lg" />
                    <TripContainer container={trip.container} inverted />
                </div>

                {/* El total es lo que el piloto ya tiene en la mano: manda. */}
                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-canvas/15 pt-5">
                    <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-canvas/50">
                            Viáticos confirmados
                        </span>

                        <span className="font-display text-4xl font-semibold tracking-tight tabular-nums">
                            {formatAmount(confirmedAmount)}
                        </span>
                    </div>

                    {pendingCount > 0 && (
                        <p className="max-w-[34ch] text-sm text-canvas/70">
                            Otros{' '}
                            <span className="font-mono tabular-nums text-canvas">
                                {formatAmount(pendingAmount)}
                            </span>{' '}
                            están registrados pero el piloto todavía no confirma haberlos
                            recibido, así que no suman aquí.
                        </p>
                    )}
                </div>
            </header>

            <p className="text-sm text-ink-muted">
                Solo cuenta el dinero que el piloto confirmó haber recibido. Los viáticos{' '}
                <span className="text-ink">no condicionan el inicio del viaje</span>: puede
                arrancar con o sin ellos. Cada viático queda registrado para siempre: no se
                puede corregir ni eliminar.
            </p>

            <section className="flex flex-col gap-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-subtle">
                    Viáticos registrados
                </h3>

                {isLoading && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Cargando viáticos
                    </p>
                )}

                {isError && (
                    <p className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
                        {error.message}
                    </p>
                )}

                {/* `data: []` no es un error: es un viaje al que nadie le ha entregado dinero. */}
                {!isLoading && !isError && expenses.length === 0 && (
                    <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-sm text-ink-muted">
                        {canAddExpense
                            ? "Este viaje todavía no tiene viáticos. Registra el primero abajo."
                            : "Este viaje todavía no tiene viáticos registrados."}
                    </p>
                )}

                {expenses.length > 0 && (
                    <ol className="flex flex-col gap-2">
                        {expenses.map((expense, index) => (
                            <TripExpenseEntry key={expense.id} expense={expense} index={index + 1} />
                        ))}
                    </ol>
                )}
            </section>

            {canAddExpense && (
                <section className="flex flex-col gap-4 border-t border-line pt-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                            Registrar un viático
                        </h3>

                        <p className="text-sm text-ink-muted">
                            El dinero que le entregas al piloto ahora. Si entregas más en
                            carretera, añade otro viático: se suman, no se reemplazan.
                        </p>
                    </div>

                    {pendingExpense ? (
                        <TripExpenseConfirmation
                            expense={pendingExpense}
                            isPending={isRegistering}
                            onBack={() => setPendingExpense(null)}
                            onConfirm={() => mutate(pendingExpense)}
                        />
                    ) : (
                        <form
                            onSubmit={handleSubmit(onSubmit)}
                            noValidate
                            className="flex flex-col gap-4"
                        >
                            <div className="grid gap-4 sm:grid-cols-2">
                                <TextFormField<TripExpenseForm>
                                    label="Monto (Q)"
                                    name="amount"
                                    type="number"
                                    placeholder="350.00"
                                    register={register}
                                    errorMessage={errors.amount?.message}
                                    validation={{
                                        required: "El monto es obligatorio",
                                        valueAsNumber: true,
                                        min: {
                                            value: 0.01,
                                            message: "El monto debe ser mayor a 0"
                                        },
                                        max: {
                                            value: TRIP_EXPENSE_MAX_AMOUNT,
                                            message: `El monto no puede superar ${TRIP_EXPENSE_MAX_AMOUNT}`
                                        }
                                    }}
                                />

                                <TextAreaFormField<TripExpenseForm>
                                    label="Descripción (opcional)"
                                    name="description"
                                    placeholder="Alimentación y peajes"
                                    rows={2}
                                    register={register}
                                    errorMessage={errors.description?.message}
                                    validation={{
                                        maxLength: {
                                            value: TRIP_TEXT_MAX_LENGTH,
                                            message: `La descripción no puede superar los ${TRIP_TEXT_MAX_LENGTH} caracteres`
                                        }
                                    }}
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
                                    <Wallet size={16} />
                                    Registrar el viático
                                </button>
                            </div>
                        </form>
                    )}
                </section>
            )}

            {!canAddExpense && (
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
    expense: TripExpense;
    /** El número de asiento: el orden es el de registro y la API lo garantiza. */
    index: number;
}

/**
 * Una línea del libro de caja. Lo confirmado pesa y lo pendiente no, así que
 * se pintan con pesos distintos: es la misma diferencia que hay entre sumar
 * al total y no sumar.
 */
function TripExpenseEntry({ expense, index }: EntryProps) {
    return (
        <li
            className={[
                "flex flex-wrap items-baseline gap-x-4 gap-y-2 rounded-lg border-l-2 bg-canvas py-3 pr-4 pl-4",
                expense.isConfirmed
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
                        className={`font-mono text-[15px] tabular-nums ${expense.isConfirmed ? "text-ink" : "text-ink-muted"}`}
                    >
                        {formatAmount(expense.amount)}
                    </span>

                    {expense.description && (
                        <span className="text-sm text-ink-muted">
                            {expense.description}
                        </span>
                    )}
                </div>

                <p className="text-xs text-ink-subtle">
                    Registró {expense.registeredByName}
                    {expense.confirmedByName && ` · Confirmó ${expense.confirmedByName}`}
                </p>
            </div>

            {expense.isConfirmed ? (
                <div className="flex flex-col items-end gap-0.5">
                    <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-success">
                        Confirmado
                    </span>

                    <TripMoment value={expense.receivedAt} withTime />
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
    expense: TripExpenseForm;
    isPending: boolean;
    onBack: () => void;
    onConfirm: () => void;
}

/**
 * El último punto donde el monto se puede corregir. Se repite la cifra en
 * grande porque es exactamente el error que se busca atrapar: un cero de más
 * pasa desapercibido en un campo y no en un titular.
 */
function TripExpenseConfirmation({ expense, isPending, onBack, onConfirm }: ConfirmationProps) {
    return (
        <div className="flex flex-col gap-4 rounded-xl border border-line-strong bg-canvas px-5 py-5">
            <div className="flex items-start gap-3">
                <TriangleAlert size={18} className="mt-0.5 shrink-0 text-ink-muted" aria-hidden />

                <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium text-ink">
                        Revisa el monto antes de guardar
                    </p>

                    <p className="text-sm text-ink-muted">
                        Un viático registrado no se puede corregir ni eliminar, y suma al
                        total del viaje en cuanto el piloto confirme haberlo recibido.
                    </p>
                </div>
            </div>

            <p className="font-display text-3xl font-semibold tracking-tight tabular-nums text-ink">
                {formatAmount(expense.amount)}
                {expense.description && (
                    <span className="ml-2 font-sans text-base font-normal text-ink-muted">
                        {expense.description}
                    </span>
                )}
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
                    {isPending ? <SpinnerComponent /> : `Registrar ${formatAmount(expense.amount)}`}
                </button>
            </div>
        </div>
    );
}
