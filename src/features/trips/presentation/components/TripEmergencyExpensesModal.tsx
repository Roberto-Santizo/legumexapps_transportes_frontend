/**
 * Los gastos emergentes del viaje: los imprevistos que ya se pagaron con el
 * camión en ruta —una llanta, una grúa— y que la empresa registra cuando el
 * piloto le avisa por fuera del sistema.
 *
 * Es hermano del diálogo de viáticos y por eso se le parece: la misma banda
 * con el total arriba y el mismo libro de caja debajo. Pero las reglas son
 * otras, y el diseño las sigue:
 *
 * - **No hay confirmación.** Todo gasto suma desde que se registra, así que
 *   todas las filas pesan igual y llevan el mismo filo sólido.
 * - **Se corrige y se borra**, también con el viaje `finished` —la factura
 *   suele llegar después del cierre—. Por eso no hay paso de confirmación del
 *   monto antes de guardar: un error se arregla en la propia fila.
 * - **Solo se registra en ruta.** En `pending` y `finished` el alta es 400.
 */

import type { TripEmergencyExpense, TripEmergencyExpenseFormValues, TripSummary } from "@/features/trips/trips";
import {
    TRIP_ALREADY_DELETED_MESSAGE,
    TRIP_EMERGENCY_EXPENSE_FOREIGN_MESSAGE,
    TRIP_EMERGENCY_EXPENSE_NOT_FOUND_MESSAGE,
    TRIP_EMERGENCY_EXPENSE_NOT_IN_ROUTE_MESSAGE,
    TRIP_EMERGENCY_EXPENSE_PENDING_MESSAGE,
    TRIP_EXPENSE_MAX_AMOUNT,
    TRIP_FUEL_NO_CARRIER_MESSAGE,
    TRIP_NOT_ASSIGNED_MESSAGE,
    TRIP_TEXT_MAX_LENGTH,
    TripContainer,
    TripEmergencyReceiptField,
    TripOrder,
    canManageTripEmergencyExpense,
    canRegisterTripEmergencyExpense,
    diffTripEmergencyExpense,
    formatAmount,
    formatTripMoment,
    getTripEmergencyExpenseFieldErrors,
    hasTripEmergencyExpenseChanges,
    isTripEmergencyExpenseCorrected,
    isTripEmergencyReceiptImage,
    parseAmount,
    tripProvider
} from "@/features/trips/trips";
import { Modal, SpinnerComponent, TextAreaFormField, TextFormField, useNotification } from "@/features/shared/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm, type Control, type FieldErrors, type UseFormRegister } from "react-hook-form";
import { useState } from "react";
import { FileText, Pencil, Siren, Trash2 } from "lucide-react";

/**
 * Fallos que no se arreglan tocando el formulario: el viaje cambió de manos,
 * de estado o desapareció. Cierran el diálogo y refrescan el viaje.
 */
const BLOCKING_MESSAGES = [
    TRIP_EMERGENCY_EXPENSE_FOREIGN_MESSAGE,
    TRIP_FUEL_NO_CARRIER_MESSAGE,
    TRIP_EMERGENCY_EXPENSE_NOT_IN_ROUTE_MESSAGE,
    TRIP_EMERGENCY_EXPENSE_PENDING_MESSAGE,
    TRIP_NOT_ASSIGNED_MESSAGE,
    TRIP_ALREADY_DELETED_MESSAGE,
];

type Props = {
    /** El viaje cuyos gastos se miran, o `null` con el diálogo cerrado. Puede llegar recortado. */
    trip: TripSummary | null;
    /** `administrator` o `carrier` con empresa: registrar, corregir y borrar. */
    canWrite: boolean;
    onClose: () => void;
}

export function TripEmergencyExpensesModal({ trip, canWrite, onClose }: Props) {
    return (
        <Modal
            modal={Boolean(trip)}
            closeModal={onClose}
            title="Gastos emergentes del viaje"
            width="sm:max-w-3xl"
        >
            {/* La `key` descarta lo tecleado al cambiar de viaje. */}
            {trip && <TripEmergencyExpensesPanel key={trip.id} trip={trip} canWrite={canWrite} onClose={onClose} />}
        </Modal>
    );
}

type PanelProps = {
    trip: TripSummary;
    canWrite: boolean;
    onClose: () => void;
}

function TripEmergencyExpensesPanel({ trip, canWrite, onClose }: PanelProps) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const tripId = trip.id.toString();

    /** La fila que se está corrigiendo. Una a la vez: el alta se esconde mientras tanto. */
    const [editingId, setEditingId] = useState<number | null>(null);

    /**
     * Cambia con cada alta exitosa para **remontar** el formulario. `reset`
     * no basta: con `amount: undefined` react-hook-form vuelve a leer el valor
     * que sigue en el DOM, y el dropzone conserva su último rechazo.
     */
    const [createFormKey, setCreateFormKey] = useState(0);

    /** Sin `limit`: un viaje tiene un puñado de gastos. Orden por `id` ascendente. */
    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getTripEmergencyExpenses', tripId],
        queryFn: () => tripProvider.getTripEmergencyExpenses(tripId)
    });

    /** El detalle y el costo cambian con cualquier escritura: los dos llevan la suma. */
    const refresh = () => {
        queryClient.invalidateQueries({ queryKey: ['getTripEmergencyExpenses', tripId] });
        queryClient.invalidateQueries({ queryKey: ['getTripById', tripId] });
        queryClient.invalidateQueries({ queryKey: ['getTripCost', tripId] });
    };

    /**
     * Lo que no es de un campo. Si el viaje ya no admite la escritura, se
     * cierra el diálogo; si el gasto ya no existe, basta con recargar la lista.
     */
    const handleError = (err: Error) => {
        notification.error(err.message);

        if (err.message.startsWith(TRIP_EMERGENCY_EXPENSE_NOT_FOUND_MESSAGE)) {
            setEditingId(null);
            refresh();
            return;
        }

        if (BLOCKING_MESSAGES.some((blocking) => err.message.startsWith(blocking))) {
            queryClient.invalidateQueries({ queryKey: ['getTrips'] });
            refresh();
            onClose();
        }
    };

    const { mutate: remove, isPending: isRemoving, variables: removingId } = useMutation({
        mutationFn: (expenseId: number) => tripProvider.deleteTripEmergencyExpense(expenseId.toString()),
        onSuccess: (message) => {
            notification.success(message);
            refresh();
        },
        onError: handleError
    });

    /** El borrado es físico y se lleva el archivo: se pregunta antes. */
    const askToDelete = (expense: TripEmergencyExpense) => {
        notification.question(
            `Eliminar el gasto de ${formatAmount(expense.amount)}`,
            "Eliminar",
            `«${expense.description}». Se borra junto con su comprobante y no se puede deshacer.`,
            () => remove(expense.id)
        );
    };

    const expenses = data?.data ?? [];
    const totalAmount = data?.totalAmount ?? "0.00";

    const canAdd = canWrite && canRegisterTripEmergencyExpense(trip);
    /** `pending` es el único estado que bloquea corregir y borrar. */
    const canManage = canWrite && canManageTripEmergencyExpense(trip);

    return (
        <div className="flex flex-col gap-7">
            <header className="flex flex-col gap-5 rounded-xl bg-ink-deep px-5 py-5 text-canvas">
                <div className="flex flex-col gap-3">
                    <TripOrder order={trip.order} size="lg" />
                    <TripContainer container={trip.container} inverted />
                </div>

                <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-3 border-t border-canvas/15 pt-5">
                    <div className="flex flex-col gap-1.5">
                        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-primary">
                            Gastos emergentes
                        </span>

                        <span className="font-display text-4xl font-semibold tracking-tight tabular-nums">
                            {formatAmount(totalAmount)}
                        </span>
                    </div>

                    {expenses.length > 0 && (
                        <p className="max-w-[34ch] text-sm text-canvas/70">
                            <span className="font-mono tabular-nums text-canvas">{expenses.length}</span>{' '}
                            {expenses.length === 1 ? "gasto registrado" : "gastos registrados"}. Todos suman
                            al costo del viaje, aparte de los viáticos.
                        </p>
                    )}
                </div>
            </header>

            <p className="text-sm text-ink-muted">
                Imprevistos que el piloto ya pagó en carretera y avisó a la empresa. No necesitan
                confirmación: suman desde que se registran. Se registran con el viaje{' '}
                <span className="text-ink">en ruta</span> y se pueden corregir o eliminar incluso
                después de finalizarlo, porque la factura suele llegar tarde.
            </p>

            <section className="flex flex-col gap-3">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-subtle">
                    Gastos registrados
                </h3>

                {isLoading && (
                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                        Cargando gastos emergentes
                    </p>
                )}

                {isError && (
                    <p className="rounded-xl border border-danger/30 bg-danger/5 px-5 py-4 text-sm text-danger">
                        {error.message}
                    </p>
                )}

                {!isLoading && !isError && expenses.length === 0 && (
                    <p className="rounded-xl border border-dashed border-line-strong bg-canvas px-5 py-8 text-center text-sm text-ink-muted">
                        {canAdd
                            ? "Este viaje no tiene gastos emergentes. Si el piloto avisó de uno, regístralo abajo."
                            : "Este viaje no tiene gastos emergentes registrados."}
                    </p>
                )}

                {expenses.length > 0 && (
                    <ol className="flex flex-col gap-2">
                        {expenses.map((expense, index) => editingId === expense.id ? (
                            <TripEmergencyExpenseEditor
                                key={expense.id}
                                expense={expense}
                                index={index + 1}
                                onDone={() => setEditingId(null)}
                                onSaved={refresh}
                                onError={handleError}
                            />
                        ) : (
                            <TripEmergencyExpenseEntry
                                key={expense.id}
                                expense={expense}
                                index={index + 1}
                                canManage={canManage && editingId === null}
                                isRemoving={isRemoving && removingId === expense.id}
                                onEdit={() => setEditingId(expense.id)}
                                onDelete={() => askToDelete(expense)}
                            />
                        ))}
                    </ol>
                )}
            </section>

            {canAdd && editingId === null && (
                <section className="flex flex-col gap-4 border-t border-line pt-6">
                    <div className="flex flex-col gap-1">
                        <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                            Registrar un gasto emergente
                        </h3>

                        <p className="text-sm text-ink-muted">
                            Lo que el piloto pagó y qué pasó. El comprobante se puede adjuntar después,
                            al corregir el gasto.
                        </p>
                    </div>

                    <TripEmergencyExpenseCreator
                        key={createFormKey}
                        tripId={tripId}
                        onCreated={() => {
                            refresh();
                            setCreateFormKey((key) => key + 1);
                        }}
                        onError={handleError}
                        onClose={onClose}
                    />
                </section>
            )}

            {(!canAdd || editingId !== null) && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
                    <p className="text-sm text-ink-muted">
                        {canWrite && editingId === null && trip.status === 'pending' && "Los gastos emergentes se registran cuando el viaje está en ruta."}
                        {canWrite && editingId === null && trip.status === 'finished' && "El viaje ya finalizó: no admite gastos nuevos, pero los registrados se pueden corregir o eliminar."}
                    </p>

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

type CreatorProps = {
    tripId: string;
    /** Refresca y remonta este formulario: así queda limpio para el siguiente gasto. */
    onCreated: () => void;
    onError: (error: Error) => void;
    onClose: () => void;
}

/** El alta. Vive aparte para poder remontarse limpia después de cada registro. */
function TripEmergencyExpenseCreator({ tripId, onCreated, onError, onClose }: CreatorProps) {
    const notification = useNotification();

    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<TripEmergencyExpenseFormValues>({
        defaultValues: { description: '', receipt: null, removeReceipt: false }
    });

    const { mutate: create, isPending } = useMutation({
        mutationFn: (values: TripEmergencyExpenseFormValues) => tripProvider.createTripEmergencyExpense(tripId, values),
        onSuccess: (message) => {
            notification.success(message);
            onCreated();
        },
        onError: (err) => {
            const fieldErrors = getTripEmergencyExpenseFieldErrors(err);

            if (fieldErrors.length > 0) {
                fieldErrors.forEach(({ field, message }) => setError(field, { message }));
                return;
            }

            onError(err);
        }
    });

    return (
        <form
            onSubmit={handleSubmit((values) => create(values))}
            noValidate
            className="flex flex-col gap-4"
        >
            <TripEmergencyExpenseFields register={register} control={control} errors={errors} />

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
                    disabled={isPending}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink-deep px-4 py-2 text-sm font-semibold text-canvas shadow-sm transition-all duration-200 hover:bg-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-subtle disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                >
                    {isPending ? <SpinnerComponent /> : <><Siren size={16} /> Registrar el gasto</>}
                </button>
            </div>
        </form>
    );
}

type FieldsProps = {
    register: UseFormRegister<TripEmergencyExpenseFormValues>;
    control: Control<TripEmergencyExpenseFormValues>;
    errors: FieldErrors<TripEmergencyExpenseFormValues>;
    /** En la corrección, el gasto original: su comprobante se puede dejar, cambiar o quitar. */
    current?: TripEmergencyExpense;
}

/** Los tres campos, iguales en el alta y en la corrección. Se valida aquí para ahorrar el 422. */
function TripEmergencyExpenseFields({ register, control, errors, current }: FieldsProps) {
    return (
        <div className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
                <TextFormField<TripEmergencyExpenseFormValues>
                    label="Monto (Q)"
                    name="amount"
                    type="number"
                    placeholder="450.00"
                    register={register}
                    errorMessage={errors.amount?.message}
                    validation={{
                        required: current ? "El monto no puede estar vacío" : "El monto es obligatorio",
                        valueAsNumber: true,
                        validate: (value) => !Number.isNaN(value) || "El monto debe ser un número",
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

                <TextAreaFormField<TripEmergencyExpenseFormValues>
                    label="¿Qué pasó?"
                    name="description"
                    placeholder="Reparación de llanta pinchada en el km 85"
                    rows={2}
                    register={register}
                    errorMessage={errors.description?.message}
                    validation={{
                        validate: (value) => String(value ?? "").trim().length > 0 || (current ? "La descripción no puede estar vacía" : "La descripción es obligatoria"),
                        maxLength: {
                            value: TRIP_TEXT_MAX_LENGTH,
                            message: `La descripción no puede superar los ${TRIP_TEXT_MAX_LENGTH} caracteres`
                        }
                    }}
                />
            </div>

            <TripEmergencyReceiptField control={control} current={current} />
        </div>
    );
}

type EntryProps = {
    expense: TripEmergencyExpense;
    /** El número de asiento: el orden es el de registro y la API lo garantiza. */
    index: number;
    canManage: boolean;
    isRemoving: boolean;
    onEdit: () => void;
    onDelete: () => void;
}

/** Una línea del libro de caja. Todas suman, así que todas llevan el mismo filo sólido. */
function TripEmergencyExpenseEntry({ expense, index, canManage, isRemoving, onEdit, onDelete }: EntryProps) {
    const corrected = isTripEmergencyExpenseCorrected(expense);

    return (
        <li className={`flex flex-wrap items-start gap-x-4 gap-y-2 rounded-lg border-l-2 border-l-primary bg-canvas py-3 pr-3 pl-4 transition-opacity ${isRemoving ? "opacity-50" : ""}`}>
            <span className="pt-1 font-mono text-[10px] tabular-nums tracking-[0.18em] text-ink-subtle">
                {index.toString().padStart(2, '0')}
            </span>

            <div className="flex min-w-0 flex-1 flex-col gap-1">
                <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <span className="font-mono text-[15px] tabular-nums text-ink">
                        {formatAmount(expense.amount)}
                    </span>

                    <span className="text-sm text-ink-muted">
                        {expense.description}
                    </span>
                </div>

                <p className="text-xs text-ink-subtle">
                    Registró {expense.registeredByName} · {formatTripMoment(expense.createdAt, true)}
                    {corrected && (
                        <span className="text-ink-muted">
                            {' '}· <span className="font-mono text-[10px] uppercase tracking-[0.16em]">Corregido</span>{' '}
                            {formatTripMoment(expense.updatedAt, true)}
                        </span>
                    )}
                </p>
            </div>

            <div className="flex items-center gap-1">
                {expense.receiptUrl ? (
                    <ReceiptLink url={expense.receiptUrl} type={expense.receiptType} />
                ) : (
                    <span className="px-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle">
                        Sin comprobante
                    </span>
                )}

                {canManage && (
                    <>
                        <button
                            type="button"
                            aria-label="Corregir el gasto"
                            title="Corregir"
                            onClick={onEdit}
                            disabled={isRemoving}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-surface hover:text-ink disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            <Pencil size={15} />
                        </button>

                        <button
                            type="button"
                            aria-label="Eliminar el gasto"
                            title="Eliminar"
                            onClick={onDelete}
                            disabled={isRemoving}
                            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-ink-subtle transition-colors hover:bg-danger/5 hover:text-danger disabled:cursor-not-allowed focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/30"
                        >
                            {isRemoving ? <SpinnerComponent /> : <Trash2 size={15} />}
                        </button>
                    </>
                )}
            </div>
        </li>
    );
}

type ReceiptLinkProps = {
    url: string;
    type: TripEmergencyExpense['receiptType'];
}

/** Miniatura si es imagen, enlace si es PDF: lo decide `receiptType`, no la URL. */
function ReceiptLink({ url, type }: ReceiptLinkProps) {
    return (
        <a
            href={url}
            target="_blank"
            rel="noreferrer"
            title="Abrir el comprobante"
            className="flex items-center gap-2 rounded-md px-1.5 py-1 text-ink-muted transition-colors hover:bg-surface hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
        >
            {isTripEmergencyReceiptImage(type) ? (
                <img src={url} alt="Comprobante" className="h-8 w-8 rounded border border-line object-cover" />
            ) : (
                <FileText size={16} />
            )}

            <span className="font-mono text-[10px] uppercase tracking-[0.16em]">
                {type ?? "Archivo"}
            </span>
        </a>
    );
}

type EditorProps = {
    expense: TripEmergencyExpense;
    index: number;
    onDone: () => void;
    onSaved: () => void;
    onError: (error: Error) => void;
}

/**
 * La fila abierta para corregir. Solo viaja lo que cambió: un cuerpo vacío
 * respondería 200 sin escribir, así que ni se pide.
 */
function TripEmergencyExpenseEditor({ expense, index, onDone, onSaved, onError }: EditorProps) {
    const notification = useNotification();

    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<TripEmergencyExpenseFormValues>({
        defaultValues: {
            amount: parseAmount(expense.amount),
            description: expense.description,
            receipt: null,
            removeReceipt: false
        }
    });

    const { mutate: update, isPending } = useMutation({
        mutationFn: (values: TripEmergencyExpenseFormValues) =>
            tripProvider.updateTripEmergencyExpense(expense.id.toString(), diffTripEmergencyExpense(values, expense)),
        onSuccess: (message) => {
            notification.success(message);
            onSaved();
            onDone();
        },
        onError: (err) => {
            const fieldErrors = getTripEmergencyExpenseFieldErrors(err);

            if (fieldErrors.length > 0) {
                fieldErrors.forEach(({ field, message }) => setError(field, { message }));
                return;
            }

            onError(err);
        }
    });

    const onSubmit = (values: TripEmergencyExpenseFormValues) => {
        if (!hasTripEmergencyExpenseChanges(diffTripEmergencyExpense(values, expense))) {
            onDone();
            return;
        }

        update(values);
    };

    return (
        <li className="flex flex-col gap-4 rounded-lg border border-line-strong border-l-2 border-l-primary bg-canvas px-4 py-4">
            <div className="flex items-baseline gap-4">
                <span className="font-mono text-[10px] tabular-nums tracking-[0.18em] text-ink-subtle">
                    {index.toString().padStart(2, '0')}
                </span>

                <h4 className="font-display text-sm font-semibold tracking-tight text-ink">
                    Corregir el gasto de {formatAmount(expense.amount)}
                </h4>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
                <TripEmergencyExpenseFields register={register} control={control} errors={errors} current={expense} />

                <div className="flex flex-wrap justify-end gap-3">
                    <button
                        type="button"
                        onClick={onDone}
                        disabled={isPending}
                        className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                    >
                        Cancelar
                    </button>

                    <button
                        type="submit"
                        disabled={isPending}
                        className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink-deep px-4 py-2 text-sm font-semibold text-canvas shadow-sm transition-all duration-200 hover:bg-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-subtle disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                    >
                        {isPending ? <SpinnerComponent /> : "Guardar cambios"}
                    </button>
                </div>
            </form>
        </li>
    );
}
