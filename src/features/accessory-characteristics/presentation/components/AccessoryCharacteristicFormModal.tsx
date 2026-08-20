/**
 * Alta y edición de la característica en la misma hoja: son los mismos dos
 * campos y la captura ocurre sin salir de la ficha del accesorio, que es donde
 * se está mirando la placa.
 */

import type {
    AccessoryCharacteristic,
    AccessoryCharacteristicForm
} from "@/features/accessory-characteristics/accessory-characteristics";
import {
    AccessoryCharacteristicFormComponent,
    accessoryCharacteristicProvider,
    DUPLICATE_NAME_MESSAGE
} from "@/features/accessory-characteristics/accessory-characteristics";
import { CustomFilledButton, Modal, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { useForm } from "react-hook-form";

type Props = {
    open: boolean;
    closeModal: () => void;
    accessoryId: string;
    /** `null` es un alta; con característica, se edita la que se está mirando. */
    characteristic: AccessoryCharacteristic | null;
}

export function AccessoryCharacteristicFormModal({ open, closeModal, accessoryId, characteristic }: Props) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors }
    } = useForm<AccessoryCharacteristicForm>();

    /** La hoja se abre limpia en un alta y con la característica cargada en una edición. */
    useEffect(() => {
        if (!open) return;

        reset(characteristic
            ? { name: characteristic.name, value: characteristic.value }
            : { name: '', value: '' });
    }, [open, characteristic, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: AccessoryCharacteristicForm) => characteristic
            ? accessoryCharacteristicProvider.updateAccessoryCharacteristicById(characteristic.id.toString(), payload)
            : accessoryCharacteristicProvider.createAccessoryCharacteristic(accessoryId, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getAccessoryCharacteristics', accessoryId] });
            closeModal();
        },
        /**
         * El nombre repetido llega como error de negocio (400) y no como 422,
         * pero es un problema de un campo concreto y se arregla en ese campo:
         * se cuelga del input en lugar de salir como aviso suelto.
         */
        onError: (err) => {
            if (err.message === DUPLICATE_NAME_MESSAGE) {
                setError('name', { message: "Este accesorio ya tiene una característica con ese nombre" });
                return;
            }

            notification.error(err.message);
        }
    });

    const onSubmit = (data: AccessoryCharacteristicForm) => mutate(data);

    return (
        <Modal
            modal={open}
            closeModal={closeModal}
            title={characteristic ? "Editar característica" : "Agregar característica"}
        >
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
                {characteristic && (
                    <p className="rounded-lg border border-dashed border-line-strong bg-canvas px-4 py-3 text-sm text-ink-muted">
                        La característica se queda en este accesorio. Si se capturó en el
                        equivocado, bórrala y regístrala en el correcto.
                    </p>
                )}

                <AccessoryCharacteristicFormComponent
                    register={register}
                    control={control}
                    errors={errors}
                />

                <CustomFilledButton
                    label={characteristic ? "Guardar cambios" : "Agregar característica"}
                    type="submit"
                    fullWitdh
                    disabled={isPending}
                />
            </form>
        </Modal>
    );
}
