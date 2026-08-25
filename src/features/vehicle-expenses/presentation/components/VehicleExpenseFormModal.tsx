/**
 * Alta y edición del gasto en la misma hoja: son los mismos cinco campos y la
 * captura ocurre sin salir de la ficha de la unidad, que es donde se está
 * mirando el historial.
 *
 * Lo que no comparten es la facturación: se fija en el alta y ya no se mueve,
 * así que la edición no la pinta y tampoco la manda.
 */

import type { VehicleExpense, VehicleExpenseForm } from "@/features/vehicle-expenses/vehicle-expenses";
import {
    toExpenseAmount,
    toExpenseDateInputValue,
    VehicleExpenseFormComponent,
    vehicleExpenseProvider
} from "@/features/vehicle-expenses/vehicle-expenses";
import { CustomFilledButton, Modal, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type Props = {
    open: boolean;
    closeModal: () => void;
    vehicleId: string;
    /** `null` es un alta; con gasto, se edita el que se está mirando. */
    expense: VehicleExpense | null;
}

export function VehicleExpenseFormModal({ open, closeModal, vehicleId, expense }: Props) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        reset,
        formState: { errors }
    } = useForm<VehicleExpenseForm>();

    /**
     * La hoja se abre limpia en un alta y con el gasto cargado en una edición.
     * La fecha se convierte de `d-m-Y` a `Y-m-d` a mano: la de la API no es ISO
     * y el input no la entendería.
     *
     * `isInvoiced` arranca sin valor a propósito: es obligatorio y no tiene
     * valor por omisión, así que dejarlo en `false` decidiría por el usuario.
     */
    useEffect(() => {
        if (!open) return;

        reset(expense
            ? {
                category: expense.category,
                nature: expense.nature,
                amount: toExpenseAmount(expense.amount),
                expenseDate: toExpenseDateInputValue(expense.expenseDate),
                description: expense.description
            }
            : {
                category: '',
                nature: '',
                amount: undefined,
                expenseDate: '',
                description: '',
                isInvoiced: undefined,
                invoice: null
            });
    }, [open, expense, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: async (payload: VehicleExpenseForm) => {
            if (expense) {
                return vehicleExpenseProvider.updateVehicleExpenseById(expense.id.toString(), payload);
            }

            const created = await vehicleExpenseProvider.createVehicleExpense(vehicleId, payload);

            /**
             * Con el interruptor apagado el backend descarta el archivo en
             * silencio y responde 201 igual. El formulario ya lo suelta al
             * elegir «Sin factura», pero esto lo confirma contra el servidor
             * en lugar de darlo por hecho.
             */
            if (payload.isInvoiced && !created.data.invoiceUrl) {
                notification.warning("El gasto quedó registrado, pero la factura no se guardó. Bórralo y regístralo de nuevo para adjuntarla.");
            }

            return created.message;
        },
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getVehicleExpenses', vehicleId] });
            closeModal();
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: VehicleExpenseForm) => mutate(data);

    return (
        <Modal
            modal={open}
            closeModal={closeModal}
            title={expense ? "Editar gasto" : "Registrar gasto"}
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
                {expense && (
                    <p className="rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-3 text-sm text-ink-muted">
                        El gasto se queda en esta unidad y con la factura que se le adjuntó al
                        registrarlo. Si algo de eso quedó mal, bórralo y regístralo de nuevo.
                    </p>
                )}

                <VehicleExpenseFormComponent
                    register={register}
                    control={control}
                    errors={errors}
                    showInvoicing={!expense}
                />

                <CustomFilledButton
                    label={expense ? "Guardar cambios" : "Registrar gasto"}
                    type="submit"
                    fullWitdh
                    disabled={isPending}
                />
            </form>
        </Modal>
    );
}
