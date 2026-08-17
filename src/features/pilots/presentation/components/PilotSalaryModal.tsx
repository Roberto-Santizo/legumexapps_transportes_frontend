/**
 * El salario se ajusta desde el listado y no en una pantalla propia: es un
 * único campo y el dato que hay que tener delante para decidirlo —el salario
 * vigente— ya está en la fila. El modal muestra el importe actual arriba y la
 * cifra nueva debajo, que es como se lee un ajuste.
 */

import type { Pilot, PilotSalaryForm } from "@/features/pilots/pilots";
import {
    PilotSalary,
    PilotSalaryFormComponent,
    SAME_SALARY_MESSAGE,
    buildPilotSalaryPayload,
    isSameSalary,
    pilotProvider
} from "@/features/pilots/pilots";
import { CustomFilledButton, Modal, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm, useWatch } from "react-hook-form";

type PanelProps = {
    pilot: Pilot;
    isPending: boolean;
    onSubmit: (payload: PilotSalaryForm) => void;
}

/**
 * Se monta por piloto —el `key` del padre— para nacer con el importe vigente
 * puesto y no arrastrar el del piloto anterior.
 */
function PilotSalaryFormPanel({ pilot, isPending, onSubmit }: PanelProps) {
    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<PilotSalaryForm>({
        defaultValues: {
            salary: pilot.salary ? Number(pilot.salary) : undefined
        }
    });

    const salary = useWatch({ control, name: 'salary' });

    /**
     * Reenviar el mismo importe responde 400 y no escribe nada en la bitácora,
     * así que el botón se apaga antes de gastar la petición.
     */
    const unchanged = isSameSalary(pilot.salary, salary);

    return (
        <form
            onSubmit={handleSubmit((data) => onSubmit(buildPilotSalaryPayload(data)))}
            noValidate
            className="flex flex-col gap-5"
        >
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-canvas px-4 py-3">
                <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Salario vigente
                </span>

                <PilotSalary value={pilot.salary} />
            </div>

            <PilotSalaryFormComponent
                register={register}
                control={control}
                errors={errors}
                currentSalary={pilot.salary}
            />

            <CustomFilledButton
                label={pilot.salary ? "Guardar ajuste" : "Asignar salario"}
                type="submit"
                fullWitdh
                disabled={isPending || unchanged}
            />
        </form>
    );
}

type Props = {
    /** `null` cierra el modal. Con piloto, se ajusta su salario. */
    pilot: Pilot | null;
    closeModal: () => void;
}

export function PilotSalaryModal({ pilot, closeModal }: Props) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { mutate: saveSalary, isPending } = useMutation({
        mutationFn: (payload: PilotSalaryForm) =>
            pilotProvider.updatePilotSalaryById(String(pilot?.id), payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getPilots'] });
            queryClient.invalidateQueries({ queryKey: ['getPilotSalaryHistory'] });
            closeModal();
        },
        /**
         * El 400 del salario repetido no es un fallo del formulario: es que no
         * había nada que guardar. Se informa y se cierra, como un guardado sin
         * cambios.
         */
        onError: (error) => {
            if (error.message === SAME_SALARY_MESSAGE) {
                notification.information("No había nada que guardar: el salario ya era ese.");
                closeModal();
                return;
            }

            notification.error(error.message);
        }
    });

    return (
        <Modal
            modal={pilot !== null}
            closeModal={closeModal}
            title={pilot?.salary ? "Ajustar salario" : "Asignar salario"}
            width="sm:max-w-lg"
        >
            {pilot && (
                <div className="flex flex-col gap-5">
                    <p className="text-sm text-ink-muted">
                        {pilot.name ?? 'Este piloto'} · {pilot.carrierName ?? 'Sin empresa'}
                    </p>

                    <PilotSalaryFormPanel
                        key={pilot.id}
                        pilot={pilot}
                        isPending={isPending}
                        onSubmit={(payload) => saveSalary(payload)}
                    />
                </div>
            )}
        </Modal>
    );
}
