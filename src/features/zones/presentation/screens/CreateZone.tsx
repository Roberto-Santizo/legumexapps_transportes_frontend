import type { ZoneForm } from "@/features/zones/zones";
import { ZONE_DEFAULT_COLOR, ZoneFormComponent, ZonePageHeader, buildZonePayload, zoneProvider } from "@/features/zones/zones";
import { CustomFilledButton, CustomForm, FadeInUp, useNotification } from "@/features/shared/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";

export function CreateZone() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        register,
        control,
        handleSubmit,
        formState: { errors },
    } = useForm<ZoneForm>({
        defaultValues: {
            name: '',
            description: '',
            color: ZONE_DEFAULT_COLOR,
            area: []
        }
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: ZoneForm) => zoneProvider.createZone(payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getZones'] });
            navigate('/zonas');
        },
        onError: (err) => notification.error(err.message)
    });

    const onSubmit = (data: ZoneForm) => mutate(buildZonePayload(data));

    return (
        <div className="flex flex-col gap-8">
            <ZonePageHeader
                title="Dibujar zona"
                subtitle="La zona entra activa: desde ese momento delimita cobertura sobre el mapa."
            />

            <FadeInUp>
                <div className="max-w-4xl">
                    <CustomForm onSubmit={handleSubmit(onSubmit)}>
                        <ZoneFormComponent
                            register={register}
                            control={control}
                            errors={errors}
                        />

                        <CustomFilledButton
                            label="Guardar zona"
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
