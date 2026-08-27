/**
 * De dónde sale y por qué puerto embarca. Los dos extremos son catálogos, pero
 * la línea que los une no: **la API no llama a Google y no recalcula la
 * polilínea nunca**. La resuelve el front con `GET /api/places/directions` y la
 * manda como un campo más.
 *
 * De ahí la regla que gobierna este componente: en cuanto cambia cualquiera de
 * los dos extremos, la polilínea guardada **se borra en el acto** y el
 * formulario queda sin ruta hasta que la nueva llegue. Si se dejara la anterior,
 * el `PATCH` respondería 200 con una ruta que ya no corresponde y el mapa
 * dibujaría el tramo equivocado sin que nadie se enterara.
 *
 * El campo de la polilínea no se teclea: se registra oculto y solo se ve su
 * error, que es la forma de decir «todavía no hay ruta» en el idioma del
 * formulario.
 */

import type { DeparturePoint } from "@/features/departure-points/departure-points";
import type { Location } from "@/features/locations/locations";
import type { TripFormValues } from "@/features/trips/trips";
import { TripRouteMap } from "@/features/trips/trips";
import { DirectionsError, formatDistanceKilometers, formatDurationHours, placeProvider } from "@/features/places/places";
import { SelectFormField } from "@/features/shared/shared";
import { Loader2, RotateCw } from "lucide-react";
import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWatch, type Control } from "react-hook-form";

/** Qué hacer después del fallo, por código. El mensaje ya lo redacta el backend. */
const DIRECTIONS_HINTS: Record<number, string> = {
    400: "Ese puerto está dado de baja. Elige otro para calcular la ruta.",
    404: "Cambia el punto de partida: desde ahí no hay carretera hacia el puerto.",
    422: "Revisa el punto de partida y el puerto antes de volver a calcular.",
    503: "Vuelve a intentarlo en unos minutos.",
};

/** Reintentar solo sirve si el fallo es transitorio. */
const isRetryable = (status: number) => status === 503 || status === 0;

type Props = {
    control: Control<TripFormValues>;
    departurePoints: DeparturePoint[];
    ports: Location[];
    /** Escribe la polilínea en el formulario. Recibe `''` cuando no hay ruta válida. */
    onPolylineChange: (polyline: string) => void;
    /** El error del campo oculto: aparece si se intenta guardar sin ruta. */
    polylineErrorMessage?: string;
    departurePointErrorMessage?: string;
    locationErrorMessage?: string;
    isLoadingCatalogs: boolean;
}

export function TripRouteSection({
    control,
    departurePoints,
    ports,
    onPolylineChange,
    polylineErrorMessage,
    departurePointErrorMessage,
    locationErrorMessage,
    isLoadingCatalogs
}: Props) {
    /**
     * Los dos extremos se leen con `useWatch` y no con el `watch` del
     * formulario: `watch()` solo se reevalua cuando su componente vuelve a
     * renderizar, y el React Compiler memoiza esta seccion porque todas sus
     * props —`control` incluido— son estables. La suscripcion tiene que nacer
     * aqui para que el cambio de select llegue a repintar el mapa.
     */
    const departurePointId = useWatch({ control, name: 'departurePointId' });
    const locationId = useWatch({ control, name: 'locationId' });

    const departurePoint = departurePoints.find((point) => point.id === Number(departurePointId));
    const hasBothEnds = Boolean(departurePoint && locationId);

    const { data: directions, isFetching, error, refetch } = useQuery({
        queryKey: ['getTripDirections', departurePoint?.id, locationId],
        queryFn: () => placeProvider.getDirections({
            locationId: Number(locationId),
            /** Llegan como cadena con ocho decimales: solo se convierten aquí. */
            latitude: Number(departurePoint!.latitude),
            longitude: Number(departurePoint!.longitude),
        }),
        enabled: hasBothEnds,
        /** Un 400, un 404 y un 422 fallan igual las veces que se pidan. */
        retry: false,
    });

    /**
     * El callback llega en línea desde el formulario y cambia de identidad en
     * cada render: se guarda en una `ref` para que el efecto dependa solo de la
     * ruta y no se dispare solo.
     */
    const onPolylineChangeRef = useRef(onPolylineChange);

    /** Se refresca en un efecto, no durante el render: la `ref` no es estado. */
    useEffect(() => {
        onPolylineChangeRef.current = onPolylineChange;
    });

    const resolvedPolyline = hasBothEnds ? directions?.polyline ?? '' : '';

    /** Corre después del de arriba —los efectos van en orden—, así que llama al último. */
    useEffect(() => {
        onPolylineChangeRef.current(resolvedPolyline);
    }, [resolvedPolyline]);

    const status = error instanceof DirectionsError ? error.status : 0;
    const hint = error ? DIRECTIONS_HINTS[status] : undefined;

    return (
        <div className="flex flex-col gap-6 rounded-2xl border border-line bg-canvas p-6">
            <div className="flex flex-col gap-1">
                <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                    Ruta por carretera
                </h3>

                <p className="text-sm text-ink-muted">
                    De la planta al puerto. La ruta se calcula al elegir los dos extremos y
                    se guarda con el viaje: si cambias alguno, se vuelve a calcular antes de
                    poder guardar.
                </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
                <SelectFormField<TripFormValues>
                    label="Punto de partida"
                    name="departurePointId"
                    options={departurePoints.map((point) => ({ value: point.id, label: point.name }))}
                    errorMessage={departurePointErrorMessage}
                    control={control}
                    validation={{ required: "El punto de partida es obligatorio" }}
                />

                <SelectFormField<TripFormValues>
                    label="Puerto de embarque"
                    name="locationId"
                    options={ports.map((port) => ({ value: port.id, label: port.name }))}
                    errorMessage={locationErrorMessage}
                    control={control}
                    validation={{ required: "El puerto de destino es obligatorio" }}
                />
            </div>

            {isLoadingCatalogs && (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Cargando catálogos
                </p>
            )}

            {!hasBothEnds && (
                <p className="text-sm text-ink-muted">
                    Elige el punto de partida y el puerto para calcular la ruta.
                </p>
            )}

            {hasBothEnds && isFetching && (
                <p className="flex items-center gap-2 text-sm text-ink-muted">
                    <Loader2 size={15} className="animate-spin text-ink-subtle" />
                    Calculando la ruta…
                </p>
            )}

            {hasBothEnds && !isFetching && error && (
                <div className="flex flex-col gap-3">
                    <p className="text-sm font-medium text-danger">{error.message}</p>

                    {hint && <p className="text-sm text-ink-muted">{hint}</p>}

                    {isRetryable(status) && (
                        <button
                            type="button"
                            onClick={() => refetch()}
                            className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-lg border border-line-strong bg-surface px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                        >
                            <RotateCw size={14} />
                            Calcular de nuevo
                        </button>
                    )}
                </div>
            )}

            {hasBothEnds && !isFetching && directions && (
                <div className="flex flex-col gap-5">
                    <div className="flex flex-wrap items-baseline gap-x-8 gap-y-2">
                        <p className="font-mono text-3xl leading-none text-ink">
                            {formatDistanceKilometers(directions.distanceKilometers)}
                        </p>

                        <p className="font-mono text-3xl leading-none text-ink-muted">
                            ~{formatDurationHours(directions.durationHours)}
                        </p>
                    </div>

                    <p className="text-xs text-ink-muted">
                        Estimación por carretera hasta {directions.locationName}, sin tráfico.
                    </p>

                    <TripRouteMap points={directions.points} height="h-[20rem]" />
                </div>
            )}

            {polylineErrorMessage && (
                <p className="text-xs text-danger">{polylineErrorMessage}</p>
            )}
        </div>
    );
}
