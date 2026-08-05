import { VehicleFormComponent, VehiclePageHeader, VehiclePlate, vehicleProvider, type VehicleForm } from "@/features/vehicles/vehicles";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

export function UpdateVehicle() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: vehicle, isLoading, isError, error } = useQuery({
        queryKey: ['getVehicleById', id],
        queryFn: () => vehicleProvider.getVehicleById(id!),
        enabled: Boolean(id)
    });

    const {
        register,
        control,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<VehicleForm>();

    useEffect(() => {
        if (vehicle) {
            setValue('plate', vehicle.plate);
            setValue('brand', vehicle.brand);
            setValue('model', vehicle.model);
            setValue('year', vehicle.year);
            setValue('capacity', Number(vehicle.capacity));
            setValue('type', vehicle.type);
            setValue('status', vehicle.status);
        }
    }, [vehicle, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: VehicleForm) => vehicleProvider.updateVehicleById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getVehicles'] });
            queryClient.invalidateQueries({ queryKey: ['getVehicleById', id] });
            navigate('/vehiculos');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: VehicleForm) => mutate(data);

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <VehiclePageHeader
                title="Editar vehículo"
                subtitle="La placa identifica la unidad en las guías ya emitidas; cámbiala solo si la unidad fue rematriculada."
            >
                {vehicle && <VehiclePlate plate={vehicle.plate} />}
            </VehiclePageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando vehículo
                </p>
            )}

            {!isLoading && vehicle && (
                <FadeInUp>
                    <div className="max-w-2xl">
                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <VehicleFormComponent
                                register={register}
                                control={control}
                                errors={errors}
                                imageRequired={false}
                                imageLabel="Reemplazar fotografía de la unidad"
                                showStatus
                            />

                            <p className="-mt-2 text-xs text-ink-muted">
                                Imagen actual: <span className="font-mono text-ink">{vehicle.image}</span>. Sube una nueva
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
