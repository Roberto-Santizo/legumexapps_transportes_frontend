import {
    ClientFormComponent,
    ClientPageHeader,
    buildClientPayload,
    canWriteClients,
    clientProvider,
    getClientFieldErrors,
    type ClientForm
} from "@/features/clients/clients";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function CreateClient() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteClients(role);

    const {
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<ClientForm>();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: ClientForm) => clientProvider.createClient(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getClients'] });
            navigate('/clientes');
        },
        /**
         * Los duplicados de código y de nombre llegan como **400 en el mensaje**,
         * no como 422 en `errors`: si solo se leyera `errors` se perderían en
         * silencio. Se anclan a su campo para que el usuario vea cuál corrige.
         *
         * Cuando los dos están ocupados a la vez solo viene el del código —se
         * comprueba primero—, así que el del nombre aparece en el siguiente envío.
         */
        onError: (err) => {
            const fieldErrors = getClientFieldErrors(err);

            if (fieldErrors.length === 0) {
                notification.error(err.message);
                return;
            }

            fieldErrors.forEach(({ field, message }) => setError(field, { message }));
        }
    });

    const onSubmit = (data: ClientForm) => mutate(buildClientPayload(data));

    return (
        <div className="flex flex-col gap-8">
            <ClientPageHeader
                title="Agregar cliente"
                subtitle="Dos datos y nada más: el código con el que ya se factura al cliente y su razón social."
            />

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-ink-muted">
                            El catálogo de clientes lo mantiene un administrador. Puedes
                            consultarlo, pero no agregar registros.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <ClientFormComponent
                                register={register}
                                errors={errors}
                            />

                            <CustomFilledButton
                                label="Agregar cliente"
                                type="submit"
                                fullWitdh
                                disabled={isPending}
                            />
                        </CustomForm>
                    </div>
                </FadeInUp>
            )}
        </div>
    );
}
