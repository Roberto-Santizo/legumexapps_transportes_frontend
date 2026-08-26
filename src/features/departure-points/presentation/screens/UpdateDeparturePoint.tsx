import type { DeparturePoint, DeparturePointForm } from "@/features/departure-points/departure-points";
import { DeparturePointFormComponent, DeparturePointPageHeader, DeparturePointStatus, buildDeparturePointPayload, departurePointProvider } from "@/features/departure-points/departure-points";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

type FormProps = {
    departurePoint: DeparturePoint;
    isPending: boolean;
    onSubmit: (payload: DeparturePointForm) => void;
    onError: (message: string) => void;
}

/**
 * El formulario se monta con el punto ya cargado y no antes: el mapa encuadra
 * sobre el pin al montarse, así que necesita las coordenadas desde el primer
 * render, no en un efecto posterior.
 */
function UpdateDeparturePointForm({ departurePoint, isPending, onSubmit, onError }: FormProps) {
    const {
        register,
        control,
        setValue,
        handleSubmit,
        formState: { errors },
    } = useForm<DeparturePointForm>({
        defaultValues: {
            name: departurePoint.name,
            description: departurePoint.description ?? '',
            googlePlaceId: departurePoint.googlePlaceId,
            latitude: Number(departurePoint.latitude),
            longitude: Number(departurePoint.longitude)
        }
    });

    return (
        <FadeInUp>
            <div className="max-w-4xl">
                <CustomForm onSubmit={handleSubmit((data) => onSubmit(buildDeparturePointPayload(data)))}>
                    <DeparturePointFormComponent
                        register={register}
                        control={control}
                        errors={errors}
                        setValue={setValue}
                        onError={onError}
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
    );
}

export function UpdateDeparturePoint() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: departurePoint, isLoading, isError, error } = useQuery({
        queryKey: ['getDeparturePointById', id],
        queryFn: () => departurePointProvider.getDeparturePointById(id!),
        enabled: Boolean(id)
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: DeparturePointForm) => departurePointProvider.updateDeparturePointById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getDeparturePoints'] });
            queryClient.invalidateQueries({ queryKey: ['getDeparturePointById', id] });
            navigate('/puntos-de-partida');
        },
        onError: (err) => notification.error(err.message)
    });

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <DeparturePointPageHeader
                title="Editar punto de partida"
                subtitle="Buscar otra dirección reapunta el punto sin perder su historial: conserva el id y a quien lo registró."
            >
                {departurePoint && <DeparturePointStatus status={departurePoint.status} />}
            </DeparturePointPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando punto de partida
                </p>
            )}

            {!isLoading && departurePoint && (
                <UpdateDeparturePointForm
                    departurePoint={departurePoint}
                    isPending={isPending}
                    onSubmit={mutate}
                    onError={(message) => notification.error(message)}
                />
            )}
        </div>
    );
}
