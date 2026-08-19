/**
 * Los dos extremos del viaje. El origen es un punto suelto que ancla el
 * buscador de Google; el destino es una fila de `locations`. Ninguno de los dos
 * viaja al servidor: `buildTripPayload` los descarta y solo manda `polyline`.
 */

import type { TripFormValues } from "@/features/trips/trips";
import { TRIP_DESTINATIONS_LIMIT, TripOriginField, TripRouteSummary } from "@/features/trips/trips";
import { locationProvider } from "@/features/locations/locations";
import { placeProvider } from "@/features/places/places";
import { SelectFormField } from "@/features/shared/shared";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Controller, useWatch, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form";

type Props = {
    control: Control<TripFormValues>;
    errors: FieldErrors<TripFormValues>;
    /** El lugar elegido escribe tres campos a la vez, así que no basta un Controller. */
    setValue: UseFormSetValue<TripFormValues>;
    onError?: (message: string) => void;
}

/** El rótulo que abre cada bloque del formulario. */
function TripFieldsetLabel({ children }: { children: string }) {
    return (
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
            {children}
        </p>
    );
}

export function TripFormComponent({ control, errors, setValue, onError }: Props) {
    const originGooglePlaceId = useWatch({ control, name: 'originGooglePlaceId' }) ?? '';
    const originLatitude = useWatch({ control, name: 'originLatitude' }) ?? 0;
    const originLongitude = useWatch({ control, name: 'originLongitude' }) ?? 0;
    const locationId = useWatch({ control, name: 'locationId' }) ?? null;

    const hasOrigin = originGooglePlaceId.trim().length > 0;
    const hasDestination = locationId !== null;

    /**
     * Los destinos dados de baja se listan igual que los activos. Elegir uno no
     * se bloquea aquí: `/directions` responde 400 y el resumen lo explica.
     */
    const { data: destinations } = useQuery({
        queryKey: ['getLocations', TRIP_DESTINATIONS_LIMIT, '1'],
        queryFn: () => locationProvider.getLocations(TRIP_DESTINATIONS_LIMIT, '1')
    });

    const destinationOptions = (destinations?.data ?? []).map((location) => ({
        value: location.id,
        label: location.name
    }));

    /**
     * Se dispara sola en cuanto hay origen y destino. `staleTime: Infinity` y
     * `refetchOnWindowFocus: false` son la defensa de costo —volver a un par ya
     * consultado sale de caché y no factura— y `retry: false` evita que un 503
     * se convierta en tres llamadas.
     */
    const { data: directions, isFetching, error, refetch } = useQuery({
        queryKey: ['directions', locationId, originLatitude, originLongitude],
        queryFn: () => placeProvider.getDirections({
            locationId: locationId as number,
            latitude: Number(originLatitude),
            longitude: Number(originLongitude)
        }),
        enabled: hasDestination && hasOrigin,
        staleTime: Infinity,
        refetchOnWindowFocus: false,
        retry: false
    });

    /** `useQuery` de TanStack v5 no tiene `onSuccess`: la polilínea se copia aquí. */
    useEffect(() => {
        if (directions) {
            setValue('polyline', directions.polyline, { shouldDirty: true, shouldValidate: true });
            return;
        }

        if (error) setValue('polyline', '');
    }, [directions, error, setValue]);

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-3">
                <TripFieldsetLabel>Punto de partida</TripFieldsetLabel>

                <Controller
                    control={control}
                    name="originGooglePlaceId"
                    rules={{ required: "Busca el punto de partida del viaje" }}
                    render={({ field }) => (
                        <TripOriginField
                            googlePlaceId={field.value ?? ''}
                            latitude={Number(originLatitude)}
                            longitude={Number(originLongitude)}
                            onPlaceSelected={(place) => {
                                field.onChange(place.id);
                                setValue('originLatitude', place.latitude, { shouldDirty: true });
                                setValue('originLongitude', place.longitude, { shouldDirty: true });
                            }}
                            onPinMoved={(latitude, longitude) => {
                                setValue('originLatitude', latitude, { shouldDirty: true });
                                setValue('originLongitude', longitude, { shouldDirty: true });
                            }}
                            onError={onError}
                            errorMessage={errors.originGooglePlaceId?.message}
                        />
                    )}
                />
            </div>

            <div className="flex flex-col gap-3">
                <TripFieldsetLabel>Destino</TripFieldsetLabel>

                <SelectFormField<TripFormValues>
                    label="Destino registrado"
                    name="locationId"
                    options={destinationOptions}
                    control={control}
                    errorMessage={errors.locationId?.message}
                    validation={{ required: "Elige el destino del viaje" }}
                />
            </div>

            <TripRouteSummary
                hasOrigin={hasOrigin}
                hasDestination={hasDestination}
                directions={directions}
                isFetching={isFetching}
                error={error}
                onRetry={() => void refetch()}
            />
        </div>
    );
}
