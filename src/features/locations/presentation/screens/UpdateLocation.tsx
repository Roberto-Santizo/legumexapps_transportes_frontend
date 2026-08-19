import type { Location, LocationForm } from "@/features/locations/locations";
import { LocationFormComponent, LocationPageHeader, LocationStatus, buildLocationPayload, locationProvider } from "@/features/locations/locations";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";

type FormProps = {
    location: Location;
    isPending: boolean;
    onSubmit: (payload: LocationForm) => void;
    onError: (message: string) => void;
}

/**
 * El formulario se monta con el destino ya cargado y no antes: el mapa encuadra
 * sobre el pin al montarse, así que necesita las coordenadas desde el primer
 * render, no en un efecto posterior.
 */
function UpdateLocationForm({ location, isPending, onSubmit, onError }: FormProps) {
    const {
        register,
        control,
        setValue,
        handleSubmit,
        formState: { errors },
    } = useForm<LocationForm>({
        defaultValues: {
            name: location.name,
            description: location.description ?? '',
            googlePlaceId: location.googlePlaceId,
            latitude: Number(location.latitude),
            longitude: Number(location.longitude)
        }
    });

    return (
        <FadeInUp>
            <div className="max-w-4xl">
                <CustomForm onSubmit={handleSubmit((data) => onSubmit(buildLocationPayload(data)))}>
                    <LocationFormComponent
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

export function UpdateLocation() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const { data: location, isLoading, isError, error } = useQuery({
        queryKey: ['getLocationById', id],
        queryFn: () => locationProvider.getLocationById(id!),
        enabled: Boolean(id)
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: LocationForm) => locationProvider.updateLocationById(id!, payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getLocations'] });
            queryClient.invalidateQueries({ queryKey: ['getLocationById', id] });
            navigate('/ubicaciones');
        },
        onError: (err) => notification.error(err.message)
    });

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <LocationPageHeader
                title="Editar destino"
                subtitle="Buscar otra dirección reapunta el destino sin perder su historial: conserva el id y las tarifas ya cotizadas."
            >
                {location && <LocationStatus status={location.status} />}
            </LocationPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando destino
                </p>
            )}

            {!isLoading && location && (
                <UpdateLocationForm
                    location={location}
                    isPending={isPending}
                    onSubmit={mutate}
                    onError={(message) => notification.error(message)}
                />
            )}
        </div>
    );
}
