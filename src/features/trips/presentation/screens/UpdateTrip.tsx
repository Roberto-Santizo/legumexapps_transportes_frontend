import {
    TRIP_ALREADY_DELETED_MESSAGE,
    TripFormComponent,
    TripOrder,
    TripPageHeader,
    buildTripUpdatePayload,
    canWriteTrips,
    getTripFieldErrors,
    hasTripEstimates,
    parseTripEstimate,
    toInputDateTime,
    tripProvider,
    type TripFormValues
} from "@/features/trips/trips";
import { tripFinishedProductProvider } from "@/features/trip-finished-products/trip-finished-products";
import { CustomFilledButton, CustomForm, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "@/config/store/store";

export function UpdateTrip() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const role = useSelector((state: RootState) => state.auth.user?.role);
    const canWrite = canWriteTrips(role);

    const { data: trip, isLoading, isError, error } = useQuery({
        queryKey: ['getTripById', id],
        queryFn: () => tripProvider.getTripById(id!),
        enabled: Boolean(id)
    });

    /**
     * Con líneas de producto el cliente queda fijo: cambiarlo es 400. Un viaje
     * anterior a SPEC 37 lista `[]` y sí puede cambiar de cliente.
     */
    const { data: productLines, isLoading: isLoadingProductLines } = useQuery({
        queryKey: ['getTripFinishedProducts', id],
        queryFn: () => tripFinishedProductProvider.getTripFinishedProducts(id!),
        enabled: Boolean(id)
    });

    const lockClient = (productLines?.length ?? 0) > 0;

    const {
        register,
        control,
        handleSubmit,
        setValue,
        setError,
        formState: { errors },
    } = useForm<TripFormValues>();

    /**
     * Las dos fechas se traducen antes de tocar el formulario: la API las
     * devuelve en `d-m-Y h:i:s A` y reenviarlas en ese formato es un 422.
     *
     * La ruta guardada se precarga para no dejar el formulario sin ruta
     * mientras se recalcula —en cuanto la sección de ruta responde, la pisa
     * con la recién resuelta—, pero **entera o nada**: el `PATCH` exige la
     * polilínea y las dos estimaciones juntas, y un viaje anterior a SPEC 30
     * no tiene estimaciones que precargar. Ese viaje solo se puede guardar con
     * una ruta recién calculada, que es exactamente lo que la spec pide para
     * rellenarlas.
     */
    useEffect(() => {
        if (!trip) return;

        setValue('order', trip.order);
        setValue('container', trip.container);
        setValue('transport', trip.transport);
        setValue('destination', trip.destination);
        setValue('clientId', trip.clientId);
        setValue('shippingLineId', trip.shippingLineId);
        setValue('departurePointId', trip.departurePointId);
        setValue('locationId', trip.locationId);
        setValue('recolectionDate', toInputDateTime(trip.recolectionDate));
        setValue('shipDate', toInputDateTime(trip.shipDate));
        setValue('observations', trip.observations);
        setValue('status', trip.status);

        const kilometers = parseTripEstimate(trip.estimatedKilometers);
        const hours = parseTripEstimate(trip.estimatedHours);

        if (kilometers !== null && hours !== null) {
            setValue('polyline', trip.polyline);
            setValue('estimatedKilometers', kilometers);
            setValue('estimatedHours', hours);
        }
    }, [trip, setValue]);

    const { mutate, isPending } = useMutation({
        mutationFn: (payload: TripFormValues) =>
            tripProvider.updateTripById(id!, buildTripUpdatePayload(payload)),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getTrips'] });
            queryClient.invalidateQueries({ queryKey: ['getTripById', id] });
            navigate(`/viajes/${id}`);
        },
        /**
         * Además de los errores de campo hay un 400 que no pertenece a ninguno:
         * «El viaje ya fue eliminado». La ficha abierta es un fantasma —otro
         * administrador se adelantó— y ya no se puede volver a abrir, así que se
         * vuelve al listado.
         */
        onError: (err) => {
            const fieldErrors = getTripFieldErrors(err);

            if (fieldErrors.length > 0) {
                fieldErrors.forEach(({ field, message }) => setError(field, { message }));
                return;
            }

            notification.error(err.message);

            if (err.message.startsWith(TRIP_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getTrips'] });
                navigate('/viajes');
            }
        }
    });

    const onSubmit = (data: TripFormValues) => mutate(data);

    if (isError) return <ErrorComponent message={error.message} />

    return (
        <div className="flex flex-col gap-8">
            <TripPageHeader
                title="Editar viaje"
                subtitle="Se reenvía el viaje completo, ruta y estimaciones incluidas: la API no las recalcula y no avisa si dejan de corresponder."
            >
                {trip && <TripOrder order={trip.order} size="lg" />}
            </TripPageHeader>

            {!canWrite && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-12 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Solo lectura
                        </p>

                        <p className="mx-auto mt-3 max-w-[44ch] text-sm text-ink-muted">
                            Los viajes los edita un administrador. Puedes consultarlos, pero no
                            modificarlos.
                        </p>
                    </div>
                </FadeInUp>
            )}

            {canWrite && (isLoading || isLoadingProductLines) && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando viaje
                </p>
            )}

            {canWrite && !isLoading && !isLoadingProductLines && trip && (
                <FadeInUp>
                    <div className="flex max-w-3xl flex-col gap-6">
                        {trip.pilotName && (
                            <p className="rounded-xl border border-line bg-canvas px-4 py-3.5 text-sm text-ink-muted">
                                Este viaje ya lo tomó una empresa y lo lleva{' '}
                                <span className="text-ink">{trip.pilotName}</span>. Editarlo no
                                cambia la tripulación: el piloto y la unidad solo se mueven desde
                                la empresa transportista.
                            </p>
                        )}

                        {/* Sin backfill en el servidor: la única forma de rellenarlas es guardar con la ruta recién calculada. */}
                        {!hasTripEstimates(trip) && (
                            <p className="rounded-xl border border-line bg-canvas px-4 py-3.5 text-sm text-ink-muted">
                                Este viaje se publicó sin distancia ni duración estimadas. Al
                                guardar se calculan con la ruta y quedan registradas.
                            </p>
                        )}

                        <CustomForm onSubmit={handleSubmit(onSubmit)}>
                            <TripFormComponent
                                register={register}
                                control={control}
                                errors={errors}
                                setValue={setValue}
                                isUpdate
                                lockClient={lockClient}
                                lockedClientName={trip.clientName}
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
            )}
        </div>
    );
}
