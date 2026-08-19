import type { LocationForm } from "@/features/locations/locations";
import { LocationFormComponent, LocationPageHeader, buildLocationPayload, locationProvider } from "@/features/locations/locations";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export function CreateLocation() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        setValue,
        handleSubmit,
        formState: { errors },
    } = useForm<LocationForm>({
        defaultValues: {
            name: '',
            description: '',
            googlePlaceId: '',
            latitude: 0,
            longitude: 0
        }
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: LocationForm) => locationProvider.createLocation(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getLocations'] });
            navigate('/ubicaciones');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: LocationForm) => mutate(buildLocationPayload(data));

    return (
        <div className="flex flex-col gap-8">
            <LocationPageHeader
                title="Registrar destino"
                subtitle="El destino entra activo: desde ese momento se le pueden cotizar tarifas de flete."
            />

            <FadeInUp>
                <div className="max-w-4xl">
                    <CustomForm onSubmit={handleSubmit(onSubmit)}>
                        <LocationFormComponent
                            register={register}
                            control={control}
                            errors={errors}
                            setValue={setValue}
                            onError={(message) => notification.error(message)}
                        />

                        <CustomFilledButton
                            label="Guardar destino"
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
