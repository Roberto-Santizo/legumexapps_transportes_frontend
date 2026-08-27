import {
    ClientCode,
    ClientFormComponent,
    ClientPageHeader,
    buildClientPayload,
    canWriteClients,
    clientProvider,
    getClientFieldErrors,
    type ClientForm
} from "@/features/clients/clients";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function UpdateClient() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteClients(role);

    const { data: client, isLoading, isError, error } = useQuery({
        queryKey: ['getClientById', id],
        queryFn: () => clientProvider.getClientById(id!),
        enabled: Boolean(id)
    });

    const {
        register,
        handleSubmit,
        setValue,
        setError,
        formState: { errors },
    } = useForm<ClientForm>();

    useEffect(() => {
        if (client) {
            setValue('code', client.code);
            setValue('name', client.name);
        }
    }, [client, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: ClientForm) => clientProvider.updateClientById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getClients'] });
            queryClient.invalidateQueries({ queryKey: ['getClientById', id] });
            navigate('/clientes');
        },
        /**
         * Igual que en el alta, el duplicado llega como 400 en el mensaje y se
         * ancla a su campo. Aquí la unicidad ignora la propia fila, así que
         * reenviar el mismo código no choca: si salta, el ocupante es otro
         * cliente —vivo o ya eliminado—.
         *
         * El otro 400 posible, «El cliente ya fue eliminado», no pertenece a
         * ningún campo: sale como notificación y devuelve al listado, donde la
         * fila ya no está.
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

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <ClientPageHeader
                title="Editar cliente"
                subtitle="Corrige el código o la razón social. El registro conserva a quien lo dio de alta."
            >
                {client && <ClientCode code={client.code} size="lg" />}
            </ClientPageHeader>

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-ink-muted">
                            El catálogo de clientes lo mantiene un administrador. Puedes
                            consultarlo, pero no editarlo.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando cliente
                </p>
            )}

            {canWrite && !isLoading && client && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <ClientFormComponent
                                register={register}
                                errors={errors}
                            />

                            <CustomFilledButton
                                label="Guardar cambios"
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
