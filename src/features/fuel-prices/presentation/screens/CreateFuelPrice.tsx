import { FuelPriceFormComponent, FuelPricePageHeader, fuelPriceProvider, type FuelPriceForm } from "@/features/fuel-prices/fuel-prices";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

export function CreateFuelPrice() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<FuelPriceForm>();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: FuelPriceForm) => fuelPriceProvider.createFuelPrice(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getFuelPrices'] });
            navigate('/gasolina-precios');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: FuelPriceForm) => mutate(data);

    return (
        <div className="flex flex-col gap-8">
            <FuelPricePageHeader
                title="Registrar precio"
                subtitle="El precio que se captura pasa a ser el vigente del combustible: con él se costean los viajes desde hoy."
            />

            <FadeInUp>
                <div className="max-w-2xl">
                    <CustomForm onSubmit={handleSubmit(onSubmit)}>
                        <FuelPriceFormComponent
                            register={register}
                            control={control}
                            errors={errors}
                        />

                        <CustomFilledButton
                            label="Registrar precio"
                            type="submit"
                            fullWitdh
                            disabled={isPending}
                        />
                    </CustomForm>
                </div>
            </FadeInUp>
        </div>
    );
}
