import {
    canEditMileage,
    MILEAGE_ADMIN_ONLY_MESSAGE,
    VehicleFormComponent,
    VehiclePageHeader,
    VehiclePlate,
    vehicleProvider,
    type VehicleForm
} from "@/features/vehicles/vehicles";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function UpdateVehicle() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    /** Solo un `administrator` mueve el odómetro; al resto se le bloquea el campo. */
    const mileageEditable = canEditMileage(role);

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
            setValue('condition', vehicle.condition);
            setValue('kilometersPerGallon', Number(vehicle.kilometersPerGallon));
            setValue('purchasePrice', Number(vehicle.purchasePrice));
            setValue('monthlyInsuranceCost', Number(vehicle.monthlyInsuranceCost));
            setValue('engineNumber', vehicle.engineNumber ?? '');
            setValue('status', vehicle.status);

            /** Sin permiso el campo ni se registra: así no puede viajar por accidente. */
            if (mileageEditable) {
                setValue('mileage', vehicle.mileage);
            }
        }
    }, [vehicle, mileageEditable, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: VehicleForm) => vehicleProvider.updateVehicleById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getVehicles'] });
            queryClient.invalidateQueries({ queryKey: ['getVehicleById', id] });
            navigate('/vehiculos');
        },
        /**
         * Un 403 por kilometraje aborta el PATCH entero: no se guardó ningún
         * otro campo del cuerpo ni se subió la imagen. Se recarga la ficha del
         * servidor para que el formulario no muestre cambios que no existen.
         */
        onError: (err) => {
            notification.error(
                err.message === MILEAGE_ADMIN_ONLY_MESSAGE
                    ? `${MILEAGE_ADMIN_ONLY_MESSAGE}. No se guardó ningún cambio de la ficha.`
                    : err.message
            );

            queryClient.invalidateQueries({ queryKey: ['getVehicleById', id] });
        }
    });

    /**
     * El kilometraje solo viaja cuando quien edita puede moverlo. Reenviar el
     * valor guardado sería seguro —el backend no lo cuenta como cambio—, pero
     * omitirlo evita que un input mal rellenado lo baje sin aviso: no hay
     * bitácora y el valor anterior no se recupera.
     */
    const onSubmit = (data: VehicleForm) => mutate({
        ...data,
        mileage: mileageEditable ? data.mileage : undefined
    });

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
                                mileageLocked={!mileageEditable}
                                storedMileage={vehicle.mileage}
                            />

                            <p className="-mt-2 text-xs text-ink-muted">
                                La unidad ya tiene fotografía. Sube una nueva solo si quieres reemplazarla.
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
