/**
 * Historial de mantenimiento de una unidad. No es una pantalla: la API exige
 * `vehicleId` en el listado y no hay comparativa de flota, así que este dominio
 * existe solo dentro del detalle del vehículo y aquí se administra entero
 * —alta, edición y borrado incluidos—.
 */

import type { VehicleExpense, VehicleExpenseFilters } from "@/features/vehicle-expenses/vehicle-expenses";
import {
    canWriteVehicleExpenses,
    CARRIER_MISSING_MESSAGE,
    formatExpenseQuetzales,
    VehicleExpenseAmount,
    VehicleExpenseAuthor,
    VehicleExpenseCategoryTag,
    VehicleExpenseDate,
    VehicleExpenseFiltersBar,
    VehicleExpenseFormModal,
    VehicleExpenseNatureTag,
    VehicleExpenseTotal,
    VEHICLE_EXPENSE_CATEGORY_LABELS,
    VEHICLE_EXPENSE_PAGE_SIZE,
    vehicleExpenseProvider
} from "@/features/vehicle-expenses/vehicle-expenses";
import {
    ActionsMenu,
    CustomFilledButton,
    FadeInUp,
    SpinnerComponent,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    useNotification
} from "@/features/shared/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

type Props = {
    vehicleId: string;
    /** La unidad se nombra por su placa en el diálogo de borrado, no por su id. */
    plate: string;
}

export function VehicleExpensesPanel({ vehicleId, plate }: Props) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    /** El `manager` lee cualquier empresa pero no escribe nada: los tres endpoints de escritura le responden 403. */
    const canWrite = canWriteVehicleExpenses(role);

    /** La página vive aquí y no en la URL: la ruta ya identifica la unidad. */
    const [page, setPage] = useState(0);
    const [filters, setFilters] = useState<VehicleExpenseFilters>({});
    const [formOpen, setFormOpen] = useState(false);
    const [expenseToEdit, setExpenseToEdit] = useState<VehicleExpense | null>(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getVehicleExpenses', vehicleId, page, filters],
        queryFn: () => vehicleExpenseProvider.getVehicleExpenses(
            vehicleId,
            VEHICLE_EXPENSE_PAGE_SIZE,
            page.toString(),
            filters
        )
    });

    const { mutate } = useMutation({
        mutationFn: (id: string) => vehicleExpenseProvider.deleteVehicleExpenseById(id),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getVehicleExpenses', vehicleId] });
        },
        onError: (err) => notification.error(err.message)
    });

    /** Cambiar un filtro devuelve el historial a la primera página. */
    const applyFilters = (next: VehicleExpenseFilters) => {
        setFilters(next);
        setPage(0);
    };

    const openCreate = () => {
        setExpenseToEdit(null);
        setFormOpen(true);
    };

    const openEdit = (expense: VehicleExpense) => {
        setExpenseToEdit(expense);
        setFormOpen(true);
    };

    /**
     * El borrado es real: la fila desaparece, el acumulado deja de incluirla y
     * no hay papelera. Se dice cuánto y de qué día se está borrando, porque
     * recuperarlo es volver a capturar los cinco campos.
     */
    const askToDelete = (expense: VehicleExpense) => {
        notification.question(
            `Eliminar el gasto de ${formatExpenseQuetzales(expense.amount)}`,
            "Eliminar",
            `${VEHICLE_EXPENSE_CATEGORY_LABELS[expense.category] ?? expense.category} del ${expense.expenseDate}. Se borra del historial de ${plate} y del acumulado, y no se puede deshacer.`,
            () => mutate(expense.id.toString())
        );
    };

    const expenses = data?.data ?? [];
    const lastPage = data?.lastPage ?? 1;
    const count = data?.total ?? expenses.length;
    const hasFilters = Boolean(filters.category || filters.nature || filters.dateFrom || filters.dateTo);

    /**
     * Un transportista sin empresa registrada recibe 403 en los cinco
     * endpoints. No es falta de permisos: le falta un paso, y decirlo es más
     * útil que pintarle un error.
     */
    if (isError && error.message === CARRIER_MISSING_MESSAGE) {
        return (
            <PanelShell>
                <p className="text-sm text-ink-muted">
                    Registra tu empresa transportista para llevar el mantenimiento de esta unidad.
                </p>
            </PanelShell>
        );
    }

    return (
        <PanelShell
            action={canWrite && (
                <CustomFilledButton
                    label="Registrar gasto"
                    type="button"
                    icon={<Plus size={16} />}
                    onClick={openCreate}
                />
            )}
        >
            <div className="flex flex-col gap-6">
                <VehicleExpenseTotal
                    totalAmount={data?.totalAmount ?? '0.00'}
                    count={count}
                    filtered={hasFilters}
                />

                <VehicleExpenseFiltersBar filters={filters} onChange={applyFilters} />

                {isLoading && <SpinnerComponent />}

                {isError && (
                    <p className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-ink">
                        {error.message}
                    </p>
                )}

                {!isLoading && !isError && expenses.length === 0 && (
                    <div className="rounded-2xl border border-dashed border-line-strong bg-canvas px-6 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            {hasFilters ? 'Sin coincidencias' : 'Historial vacío'}
                        </p>

                        <p className="mx-auto mt-3 max-w-[36ch] font-display text-lg font-semibold tracking-tight text-ink">
                            {hasFilters
                                ? "Ningún gasto coincide con estos filtros."
                                : "Esta unidad no tiene gastos registrados."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            {hasFilters
                                ? "Amplía el rango de fechas o quita la categoría para ver más movimientos."
                                : "Registra el primer mantenimiento para saber cuánto cuesta mantenerla en ruta."}
                        </p>

                        {!hasFilters && canWrite && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Registrar gasto"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={openCreate}
                                />
                            </div>
                        )}
                    </div>
                )}

                {!isLoading && !isError && expenses.length > 0 && (
                    <FadeInUp>
                        <Table>
                            <Thead>
                                <Th text="Fecha" />
                                <Th text="Categoría" />
                                <Th text="Naturaleza" />
                                <Th text="Descripción" />
                                <Th text="Monto" />
                                <Th text="Registró" />
                                <Th text="" />
                            </Thead>

                            <Tbody>
                                {expenses.map((expense) => (
                                    <Tr key={expense.id}>
                                        <Td>
                                            <VehicleExpenseDate expenseDate={expense.expenseDate} />
                                        </Td>

                                        <Td>
                                            <VehicleExpenseCategoryTag category={expense.category} />
                                        </Td>

                                        <Td>
                                            <VehicleExpenseNatureTag nature={expense.nature} />
                                        </Td>

                                        <Td>
                                            {/* Aquí caben el taller, la factura y la pieza: la API no tiene campos propios para eso. */}
                                            <p className="line-clamp-2 max-w-[32ch] text-sm text-ink-muted" title={expense.description}>
                                                {expense.description}
                                            </p>
                                        </Td>

                                        <Td>
                                            <VehicleExpenseAmount amount={expense.amount} />
                                        </Td>

                                        <Td>
                                            <VehicleExpenseAuthor
                                                registeredBy={expense.registeredBy}
                                                createdAt={expense.createdAt}
                                            />
                                        </Td>

                                        <Td className="text-right">
                                            {canWrite && (
                                                <ActionsMenu
                                                    items={[
                                                        {
                                                            label: "Editar",
                                                            icon: <Pencil />,
                                                            onClick: () => openEdit(expense)
                                                        },
                                                        {
                                                            label: "Eliminar",
                                                            icon: <Trash2 />,
                                                            onClick: () => askToDelete(expense),
                                                            danger: true
                                                        }
                                                    ]}
                                                />
                                            )}
                                        </Td>
                                    </Tr>
                                ))}
                            </Tbody>
                        </Table>
                    </FadeInUp>
                )}

                {lastPage > 1 && (
                    <div className="flex items-center justify-between border-t border-line pt-4">
                        <button
                            type="button"
                            onClick={() => setPage((current) => Math.max(current - 1, 0))}
                            disabled={page === 0}
                            className="inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            <ChevronLeft size={14} />
                            Recientes
                        </button>

                        <span className="font-mono text-[11px] tabular-nums text-ink-subtle">
                            {page + 1} / {lastPage}
                        </span>

                        <button
                            type="button"
                            onClick={() => setPage((current) => current + 1)}
                            disabled={page + 1 >= lastPage}
                            className="inline-flex cursor-pointer items-center gap-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-muted transition-colors hover:text-ink disabled:cursor-not-allowed disabled:text-ink-subtle focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            Anteriores
                            <ChevronRight size={14} />
                        </button>
                    </div>
                )}
            </div>

            {canWrite && (
                <VehicleExpenseFormModal
                    open={formOpen}
                    closeModal={() => setFormOpen(false)}
                    vehicleId={vehicleId}
                    expense={expenseToEdit}
                />
            )}
        </PanelShell>
    );
}

type ShellProps = {
    children: React.ReactNode;
    action?: React.ReactNode;
}

/** Mismo marco que la ficha de la unidad: el historial es otra hoja del mismo expediente. */
function PanelShell({ children, action }: ShellProps) {
    return (
        <section className="max-w-4xl rounded-2xl border border-line bg-surface p-6 shadow-sm sm:p-8">
            <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
                <div>
                    <h3 className="font-display text-xl font-semibold tracking-tight text-ink">
                        Mantenimiento
                    </h3>

                    <p className="mt-1 text-sm text-ink-muted">
                        Lo que se ha gastado en mantener esta unidad en ruta.
                    </p>
                </div>

                {action}
            </div>

            {children}
        </section>
    );
}
