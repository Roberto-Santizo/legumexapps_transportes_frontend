import { CarrierCodeStamp, CarrierFormComponent, CarrierPageHeader, carrierProvider, type CarrierForm } from "@/features/carriers/carriers";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

export function UpdateCarrier() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: carrier, isLoading, isError, error } = useQuery({
        queryKey: ['getCarrierById', id],
        queryFn: () => carrierProvider.getCarrierById(id!),
        enabled: Boolean(id)
    });

    const {
        register,
        control,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<CarrierForm>();

    useEffect(() => {
        if (carrier) {
            setValue('name', carrier.name);
        }
    }, [carrier, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: CarrierForm) => carrierProvider.updateCarrierById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getCarriers'] });
            queryClient.invalidateQueries({ queryKey: ['getCarrierById', id] });
            navigate('/transportistas');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: CarrierForm) => mutate(data);

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <CarrierPageHeader
                title="Editar transportista"
                subtitle="El código no cambia: es la referencia con la que ya se emitieron guías."
            >
                {carrier && <CarrierCodeStamp code={carrier.code} />}
            </CarrierPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando transportista
                </p>
            )}

            {!isLoading && carrier && (
                <FadeInUp>
                    <div className="max-w-xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <CarrierFormComponent
                                register={register}
                                control={control}
                                errors={errors}
                                imageRequired={false}
                                imageLabel="Reemplazar logo o fotografía"
                            />

                            <p className="-mt-2 text-xs text-ink-muted">
                                Imagen actual: <span className="font-mono text-ink">{carrier.image}</span>. Sube una nueva
                                solo si quieres reemplazarla.
                            </p>

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
