import { FuelPriceFormComponent, FuelPricePageHeader, FuelPriceStatus, fuelPriceProvider, type FuelPriceForm } from "@/features/fuel-prices/fuel-prices";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

export function UpdateFuelPrice() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: fuelPrice, isLoading, isError, error } = useQuery({
        queryKey: ['getFuelPriceById', id],
        queryFn: () => fuelPriceProvider.getFuelPriceById(id!),
        enabled: Boolean(id)
    });

    const {
        register,
        control,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<FuelPriceForm>();

    useEffect(() => {
        if (fuelPrice) {
            setValue('fuelType', fuelPrice.fuelType);
            setValue('price', Number(fuelPrice.price));
        }
    }, [fuelPrice, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: FuelPriceForm) => fuelPriceProvider.updateFuelPriceById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getFuelPrices'] });
            queryClient.invalidateQueries({ queryKey: ['getFuelPriceById', id] });
            navigate('/gasolina-precios');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: FuelPriceForm) => mutate(data);

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <FuelPricePageHeader
                title="Editar precio"
                subtitle="Corrige el registro cuando se capturó mal. Para un cambio de precio en el surtidor, registra uno nuevo y deja este en el historial."
            >
                {fuelPrice && <FuelPriceStatus status={fuelPrice.status} />}
            </FuelPricePageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando precio
                </p>
            )}

            {!isLoading && fuelPrice && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <FuelPriceFormComponent
                                register={register}
                                control={control}
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
