import { canCreateVehicle, VehicleFormComponent, VehiclePageHeader, vehicleProvider, type VehicleForm } from "@/features/vehicles/vehicles";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function CreateVehicle() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);

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

    /**
     * El alta es `role:carrier` a secas: un `administrator` recibe 403 aunque
     * pueda listar, ver, editar y desactivar. Se dice antes de que teclee los
     * trece campos, no después de perderlos.
     */
    if (!canCreateVehicle(role)) {
        return (
            <div className="flex flex-col gap-8">
                <VehiclePageHeader
                    title="Nuevo vehículo"
                    subtitle="Las unidades las registra cada transportista."
                />

                <FadeInUp>
                    <div className="max-w-2xl rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Alta no disponible
                        </p>

                        <p className="mx-auto mt-3 max-w-[38ch] font-display text-xl font-semibold tracking-tight text-ink">
                            Solo un transportista puede registrar una unidad.
                        </p>

                        <p className="mx-auto mt-2 max-w-[46ch] text-sm text-ink-muted">
                            La unidad queda vinculada a la empresa de quien la registra. Desde aquí sí puedes
                            consultar, editar y desactivar las unidades ya registradas.
                        </p>

                        <div className="mt-6 flex justify-center">
                            <CustomFilledButton
                                label="Ver vehículos"
                                type="button"
                                onClick={() => navigate('/vehiculos')}
                            />
                        </div>
                    </div>
                </FadeInUp>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <VehiclePageHeader
                title="Nuevo vehículo"
                subtitle="Registra la unidad con su ficha técnica y sus costos: con esos datos se decide qué carga puede llevar y cuánto cuesta operarla."
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
