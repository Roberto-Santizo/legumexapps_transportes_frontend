import {
    FINISHED_PRODUCT_CLIENTS_LIMIT,
    FinishedProductFormComponent,
    FinishedProductPageHeader,
    buildFinishedProductPayload,
    canWriteFinishedProducts,
    finishedProductProvider,
    getFinishedProductFieldErrors,
    toFinishedProductClientOptions,
    type FinishedProductForm,
    type FinishedProductPayload
} from "@/features/finished-products/finished-products";
import { clientProvider } from "@/features/clients/clients";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function CreateFinishedProduct() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteFinishedProducts(role);

    const { data: clients } = useQuery({
        queryKey: ['getClients', FINISHED_PRODUCT_CLIENTS_LIMIT, '0', ''],
        queryFn: () => clientProvider.getClients(FINISHED_PRODUCT_CLIENTS_LIMIT, '0', {}),
        enabled: canWrite
    });

    const {
        register,
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<FinishedProductForm>({
        defaultValues: { code: '', name: '', presentation: '', boxesPerPallet: '', clientId: null }
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: FinishedProductPayload) => finishedProductProvider.createFinishedProduct(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getFinishedProducts'] });
            navigate('/productos-terminados');
        },
        /**
         * El código duplicado y el cliente borrado llegan como **400 en el
         * mensaje**: se anclan a su campo para que no se pierdan.
         */
        onError: (err) => {
            const fieldErrors = getFinishedProductFieldErrors(err);

            if (fieldErrors.length === 0) {
                notification.error(err.message);
                return;
            }

            fieldErrors.forEach(({ field, message }) => setError(field, { message }));
        }
    });

    const onSubmit = (data: FinishedProductForm) => mutate(buildFinishedProductPayload(data));

    return (
        <div className="flex flex-col gap-8">
            <FinishedProductPageHeader
                title="Agregar producto terminado"
                subtitle="El SKU de un cliente: su código, cómo se empaca y cuántas cajas caben en una tarima."
            />

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-ink-muted">
                            El catálogo de productos terminados lo mantienen administración y
                            exportación. Puedes consultarlo, pero no agregar registros.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <FinishedProductFormComponent
                                register={register}
                                control={control}
                                errors={errors}
                                clientOptions={toFinishedProductClientOptions(clients?.data ?? [])}
                            />

                            <CustomFilledButton
                                label="Agregar producto"
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
