import {
    AccessoryFormComponent,
    AccessoryPageHeader,
    AccessoryStatusTag,
    accessoryProvider,
    canWriteAccessories,
    toDateInputValue,
    toAmount,
    type AccessoryForm
} from "@/features/accessories/accessories";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function UpdateAccessory() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteAccessories(role);

    const { data: accessory, isLoading, isError, error } = useQuery({
        queryKey: ['getAccessoryById', id],
        queryFn: () => accessoryProvider.getAccessoryById(id!),
        enabled: Boolean(id)
    });

    const {
        register,
        handleSubmit,
        setValue,
        control,
        formState: { errors },
    } = useForm<AccessoryForm>();

    /**
     * `currentValue` no se puebla: es derivado y no viaja de vuelta. La fecha
     * cambia de formato aquí —llega en `d-m-Y` y el input la quiere en `Y-m-d`—
     * y los importes dejan de ser cadena.
     */
    useEffect(() => {
        if (accessory) {
            setValue('name', accessory.name);
            setValue('code', accessory.code);
            setValue('description', accessory.description ?? '');
            setValue('price', toAmount(accessory.price));
            setValue('purchaseDate', toDateInputValue(accessory.purchaseDate));
            setValue('annualDepreciation', toAmount(accessory.annualDepreciation));
            setValue('status', accessory.status);
        }
    }, [accessory, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: AccessoryForm) => accessoryProvider.updateAccessoryById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getAccessories'] });
            queryClient.invalidateQueries({ queryKey: ['getAccessoryById', id] });
            navigate('/accesorios');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: AccessoryForm) => mutate(data);

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <AccessoryPageHeader
                title="Editar accesorio"
                subtitle="Cambiar el precio, la fecha de compra o la depreciación recalcula el valor de hoy. El estado se mueve en cualquier dirección: así se reactiva una baja."
            >
                {accessory && <AccessoryStatusTag status={accessory.status} />}
            </AccessoryPageHeader>

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[42ch] text-sm text-ink-muted">
                            El inventario lo mantiene un administrador. Puedes consultar los
                            accesorios, pero no editarlos.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando accesorio
                </p>
            )}

            {canWrite && !isLoading && accessory && (
                <FadeInUp>
                    <div className="max-w-3xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <AccessoryFormComponent
                                register={register}
                                errors={errors}
                                control={control}
                                showStatus
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
