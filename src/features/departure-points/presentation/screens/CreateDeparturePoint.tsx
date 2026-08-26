import type { DeparturePointForm } from "@/features/departure-points/departure-points";
import { DeparturePointFormComponent, DeparturePointPageHeader, buildDeparturePointPayload, departurePointProvider } from "@/features/departure-points/departure-points";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

export function CreateDeparturePoint() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        setValue,
        handleSubmit,
        formState: { errors },
    } = useForm<DeparturePointForm>({
        defaultValues: {
            name: '',
            description: '',
            googlePlaceId: '',
            latitude: 0,
            longitude: 0
        }
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: DeparturePointForm) => departurePointProvider.createDeparturePoint(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getDeparturePoints'] });
            navigate('/puntos-de-partida');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: DeparturePointForm) => mutate(buildDeparturePointPayload(data));

    return (
        <div className="flex flex-col gap-8">
            <DeparturePointPageHeader
                title="Registrar punto de partida"
                subtitle="El punto entra activo: desde ese momento se puede elegir como origen de un viaje."
            />

            <FadeInUp>
                <div className="max-w-4xl">
                    <CustomForm onSubmit={handleSubmit(onSubmit)}>
                        <DeparturePointFormComponent
                            register={register}
                            control={control}
                            errors={errors}
                            setValue={setValue}
                            onError={(message) => notification.error(message)}
                        />

                        <CustomFilledButton
                            label="Guardar punto de partida"
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
