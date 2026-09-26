import {
    FINISHED_PRODUCT_ALREADY_DELETED_MESSAGE,
    FINISHED_PRODUCT_CLIENTS_LIMIT,
    FinishedProductCode,
    FinishedProductFormComponent,
    FinishedProductPageHeader,
    buildFinishedProductUpdatePayload,
    canWriteFinishedProducts,
    finishedProductProvider,
    getFinishedProductFieldErrors,
    toFinishedProductClientOptions,
    type FinishedProductForm,
    type FinishedProductUpdatePayload
} from "@/features/finished-products/finished-products";
import { clientProvider } from "@/features/clients/clients";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function UpdateFinishedProduct() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteFinishedProducts(role);

    const { data: finishedProduct, isLoading, isError, error } = useQuery({
        queryKey: ['getFinishedProductById', id],
        queryFn: () => finishedProductProvider.getFinishedProductById(id!),
        enabled: Boolean(id)
    });

    const { data: clients } = useQuery({
        queryKey: ['getClients', FINISHED_PRODUCT_CLIENTS_LIMIT, '0', ''],
        queryFn: () => clientProvider.getClients(FINISHED_PRODUCT_CLIENTS_LIMIT, '0', {}),
        enabled: canWrite
    });

    const {
        register,
        control,
        handleSubmit,
        reset,
        setError,
        formState: { errors },
    } = useForm<FinishedProductForm>({
        defaultValues: { code: '', name: '', presentation: '', boxesPerPallet: '', clientId: null }
    });

    useEffect(() => {
        if (finishedProduct) {
            reset({
                code: finishedProduct.code,
                name: finishedProduct.name,
                presentation: finishedProduct.presentation,
                boxesPerPallet: finishedProduct.boxesPerPallet,
                clientId: finishedProduct.clientId,
            });
        }
    }, [finishedProduct, reset]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: FinishedProductUpdatePayload) => finishedProductProvider.updateFinishedProductById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getFinishedProducts'] });
            queryClient.invalidateQueries({ queryKey: ['getFinishedProductById', id] });
            navigate('/productos-terminados');
        },
        /**
         * Código duplicado y cliente borrado se anclan a su campo. «Ya fue
         * eliminado» (el SKU) no es de ningún campo: notificación y al listado.
         */
        onError: (err) => {
            const fieldErrors = getFinishedProductFieldErrors(err);

            if (fieldErrors.length > 0) {
                fieldErrors.forEach(({ field, message }) => setError(field, { message }));
                return;
            }

            notification.error(err.message);

            if (err.message.startsWith(FINISHED_PRODUCT_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getFinishedProducts'] });
                navigate('/productos-terminados');
            }
        }
    });

    /** Solo lo que cambió: reenviar el `clientId` de un cliente borrado daría 400. */
    const onSubmit = (data: FinishedProductForm) => {
        if (finishedProduct) mutate(buildFinishedProductUpdatePayload(data, finishedProduct));
    };

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <FinishedProductPageHeader
                title="Editar producto terminado"
                subtitle="Solo se envía lo que cambies. El registro conserva a quien lo dio de alta."
            >
                {finishedProduct && <FinishedProductCode code={finishedProduct.code} size="lg" />}
            </FinishedProductPageHeader>

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-ink-muted">
                            El catálogo de productos terminados lo mantienen administración y
                            exportación. Puedes consultarlo, pero no editarlo.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando producto terminado
                </p>
            )}

            {canWrite && !isLoading && finishedProduct && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <FinishedProductFormComponent
                                register={register}
                                control={control}
                                errors={errors}
                                clientOptions={toFinishedProductClientOptions(clients?.data ?? [], finishedProduct)}
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
