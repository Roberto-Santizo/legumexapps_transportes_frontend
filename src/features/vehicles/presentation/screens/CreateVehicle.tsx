import { VehicleFormComponent, VehiclePageHeader, vehicleProvider, type VehicleForm } from "@/features/vehicles/vehicles";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

export function CreateVehicle() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<VehicleForm>();

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: VehicleForm) => vehicleProvider.createVehicle(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getVehicles'] });
            navigate('/vehiculos');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: VehicleForm) => mutate(data);

    return (
        <div className="flex flex-col gap-8">
            <VehiclePageHeader
                title="Nuevo vehículo"
                subtitle="Registra la unidad con su placa y su capacidad: con esos datos se decide qué carga puede llevar."
            />

            <FadeInUp>
                <div className="max-w-2xl">
                    <CustomForm onSubmit={handleSubmit(onSubmit)}>
                        <VehicleFormComponent
                            register={register}
                            control={control}
                            errors={errors}
                        />

                        <CustomFilledButton
                            label="Registrar vehículo"
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
