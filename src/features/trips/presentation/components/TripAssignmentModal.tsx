/**
 * Tomar el viaje: el acto que le da dueño. Un viaje no pertenece a ninguna
 * empresa —no hay `carrierId` en la tabla— y es esta pantalla la que lo hace
 * suyo. De ahí el peso que se le da en el texto: **no se puede desasignar**, el
 * viaje no vuelve nunca a la bolsa y, en cuanto se guarda, desaparece del
 * listado de todas las demás empresas.
 *
 * Se eligen los dos a la vez porque la API los exige juntos: no se puede
 * asignar solo piloto o solo vehículo, y `null` en cualquiera de los dos es un
 * 422. Por eso son tarjetas y no desplegables —hay que comparar de un vistazo
 * quién va y en qué unidad antes de un movimiento que no se deshace— y por eso
 * el botón dice «Tomar el viaje» y no «Guardar».
 *
 * Solo se ofrecen vehículos `active`: `inactive` y `under_repair` los rechaza
 * el service con un 400, y el piloto y el vehículo tienen que ser de la misma
 * empresa.
 *
 * Desde SPEC 27 el acto es **triple**: junto con la tripulación va la primera
 * carga de combustible, en la misma transacción. Ningún viaje queda tomado con
 * cero cargas, y como el viaje no arranca hasta que el piloto confirme alguna,
 * los galones que se tecleen aquí son lo primero que él tendrá que aceptar.
 * Reasignar **añade otra carga**, nunca reemplaza la anterior.
 */

import type { TripAssignmentFormValues, TripSummary } from "@/features/trips/trips";
import {
    TRIP_CREW_LIMIT,
    TRIP_FUEL_TYPES,
    TRIP_NOT_PENDING_MESSAGE,
    TRIP_TAKEN_MESSAGE,
    TripContainer,
    TripOrder,
    buildTripAssignmentPayload,
    getTripAssignmentFieldErrors,
    tripProvider
} from "@/features/trips/trips";
import { CardSelectFormField } from "@/features/pilots/pilots";
import { VEHICLE_TYPE_LABELS, VehicleCardSelectFormField, vehicleProvider } from "@/features/vehicles/vehicles";
import { CustomForm, Modal, SelectFormField, SpinnerComponent, TextFormField, useNotification } from "@/features/shared/shared";
import { pilotProvider } from "@/features/pilots/pilots";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IdCard } from "lucide-react";

type Props = {
    /**
     * El viaje que se va a tomar, o `null` con el diálogo cerrado. Se abre
     * desde el listado y desde la ficha, así que puede llegar recortado.
     */
    trip: TripSummary | null;
    onClose: () => void;
}

export function TripAssignmentModal({ trip, onClose }: Props) {
    return (
        <Modal
            modal={Boolean(trip)}
            closeModal={onClose}
            title="Tomar el viaje"
            width="sm:max-w-3xl"
        >
            {/* La `key` reinicia la elección al cambiar de viaje. */}
            {trip && <TripAssignmentForm key={trip.id} trip={trip} onClose={onClose} />}
        </Modal>
    );
}

type FormProps = {
    trip: TripSummary;
    onClose: () => void;
}

function TripAssignmentForm({ trip, onClose }: FormProps) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    /**
     * Reasignar parte de la tripulación actual, y esos dos ids **solo están en
     * el detalle**: el listado manda el nombre del piloto y la placa, no las
     * claves. Cuando el viaje llega de la tabla y ya tiene tripulación se pide
     * la ficha solo para precargar las tarjetas; tomarlo por primera vez no
     * necesita nada y no dispara ninguna petición.
     */
    const needsCrewIds = trip.pilotId === undefined && trip.pilotName !== null;

    const { data: detail } = useQuery({
        queryKey: ['getTripById', trip.id.toString()],
        queryFn: () => tripProvider.getTripById(trip.id.toString()),
        enabled: needsCrewIds
    });

    const crew = needsCrewIds ? detail : trip;

    /**
     * `values` y no `defaultValues`: la tripulación actual puede llegar después
     * del primer render, y mientras no se sepa el formulario arranca vacío.
     */
    const currentCrew = crew && crew.pilotId != null && crew.vehicleId != null
        ? { pilotId: crew.pilotId, vehicleId: crew.vehicleId }
        : undefined;

    /**
     * Solo la tripulación se precarga. Los galones nacen vacíos siempre: cada
     * asignación crea **su propia carga** y heredar la cifra de la anterior
     * invitaría a guardar sin mirar un número que no se puede corregir.
     *
     * `keepDirtyValues` protege justo eso. La tripulación llega del detalle y
     * puede resolverse **después** de que el usuario empiece a teclear; sin él,
     * ese `values` que aparece tarde reiniciaría el formulario entero y se
     * llevaría por delante unos galones ya escritos.
     */
    const {
        control,
        register,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<TripAssignmentFormValues>({
        values: currentCrew,
        resetOptions: { keepDirtyValues: true }
    });

    const { data: pilots, isLoading: isLoadingPilots } = useQuery({
        queryKey: ['getPilots', TRIP_CREW_LIMIT, '0'],
        queryFn: () => pilotProvider.getPilots(TRIP_CREW_LIMIT, '0')
    });

    const { data: vehicles, isLoading: isLoadingVehicles } = useQuery({
        queryKey: ['getVehicles', TRIP_CREW_LIMIT, '0', 'active'],
        queryFn: () => vehicleProvider.getVehicles(TRIP_CREW_LIMIT, '0', { status: 'active' })
    });

    const { mutate, isPending } = useMutation({
        mutationFn: (values: TripAssignmentFormValues) =>
            tripProvider.assignTripById(trip.id.toString(), buildTripAssignmentPayload(values)),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getTrips'] });
            queryClient.invalidateQueries({ queryKey: ['getTripById', trip.id.toString()] });
            /** La asignación acaba de crear una carga: el registro cambió. */
            queryClient.invalidateQueries({ queryKey: ['getTripFuels', trip.id.toString()] });
            onClose();
        },
        /**
         * Dos fallos no son del formulario y sacan al usuario de aquí:
         *
         * - **Otra empresa se adelantó** (403). La escritura corre con bloqueo
         *   de fila, así que de dos transportistas simultáneos solo gana uno. El
         *   viaje acaba de salir de nuestro ámbito: hay que invalidarlo o se
         *   queda pintado un viaje que la API ya no devuelve.
         * - **El viaje dejó de estar pendiente** (400). Reasignar solo se puede
         *   mientras siga `pending`.
         */
        onError: (error) => {
            const fieldErrors = getTripAssignmentFieldErrors(error);

            if (fieldErrors.length > 0) {
                fieldErrors.forEach(({ field, message }) => setError(field, { message }));
                return;
            }

            notification.error(error.message);

            if (error.message.startsWith(TRIP_TAKEN_MESSAGE) || error.message.startsWith(TRIP_NOT_PENDING_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getTrips'] });
                queryClient.invalidateQueries({ queryKey: ['getTripById', trip.id.toString()] });
                onClose();
            }
        }
    });

    const onSubmit = (data: TripAssignmentFormValues) => mutate(data);

    const pilotOptions = (pilots?.data ?? []).map((pilot) => ({
        value: pilot.id,
        label: pilot.name ?? `Piloto ${pilot.id}`,
        description: pilot.email ?? "Sin correo registrado",
        meta: pilot.carrierName ?? undefined,
        icon: <IdCard size={18} />,
    }));

    const vehicleOptions = (vehicles?.data ?? []).map((vehicle) => ({
        value: vehicle.id,
        label: vehicle.plate,
        code: vehicle.plate,
        description: `${vehicle.brand} ${vehicle.model} · ${VEHICLE_TYPE_LABELS[vehicle.type] ?? vehicle.type} · ${vehicle.year}`,
    }));

    const isLoadingCrew = isLoadingPilots || isLoadingVehicles;

    return (
        <CustomForm onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-3 rounded-xl bg-ink-deep px-5 py-4 text-canvas">
                <TripOrder order={trip.order} size="lg" />
                <TripContainer container={trip.container} inverted />
            </div>

            <p className="text-sm text-ink-muted">
                Al tomarlo, el viaje pasa a ser de tu empresa y deja de aparecer para las
                demás. <span className="text-ink">No se puede soltar</span>: no existe
                desasignar y el viaje no vuelve a la bolsa. Mientras siga pendiente sí
                puedes cambiar de piloto o de unidad.
            </p>

            {isLoadingCrew && (
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                    Cargando tripulación
                </p>
            )}

            <CardSelectFormField<TripAssignmentFormValues>
                label="Piloto"
                name="pilotId"
                description="Quién conduce. Tiene que ser un piloto de tu misma empresa."
                options={pilotOptions}
                errorMessage={errors.pilotId?.message}
                control={control}
                validation={{ required: "El piloto es obligatorio" }}
                columns={2}
                disabled={isPending}
            />

            <VehicleCardSelectFormField<TripAssignmentFormValues>
                label="Unidad"
                name="vehicleId"
                description="Solo aparecen las unidades activas: una inactiva o en taller la rechaza el servidor."
                options={vehicleOptions}
                errorMessage={errors.vehicleId?.message}
                control={control}
                validation={{ required: "El vehículo es obligatorio" }}
                columns={2}
                disabled={isPending}
            />

            {/* El combustible viaja con la tripulación: la API los exige en el mismo cuerpo. */}
            <div className="flex flex-col gap-4 border-t border-line pt-6">
                <div className="flex flex-col gap-1">
                    <h3 className="font-display text-base font-semibold tracking-tight text-ink">
                        Primera carga de combustible
                    </h3>

                    <p className="text-sm text-ink-muted">
                        Los galones que le entregas al viaje. Quedan{' '}
                        <span className="text-ink">pendientes de confirmación</span> del
                        piloto, y hasta que él confirme una carga{' '}
                        <span className="text-ink">no puede iniciar el viaje</span>. Si
                        cambias la tripulación se registra otra carga: se suman, no se
                        reemplazan.
                    </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                    <TextFormField<TripAssignmentFormValues>
                        label="Galones"
                        name="fuelGallons"
                        type="number"
                        placeholder="45.50"
                        register={register}
                        errorMessage={errors.fuelGallons?.message}
                        validation={{
                            required: "Los galones de combustible son obligatorios",
                            valueAsNumber: true,
                            min: {
                                value: 0.01,
                                message: "Los galones de combustible deben ser mayores a 0"
                            }
                        }}
                        disabled={isPending}
                    />

                    <SelectFormField<TripAssignmentFormValues>
                        label="Tipo de combustible"
                        name="fuelType"
                        options={TRIP_FUEL_TYPES}
                        control={control}
                        errorMessage={errors.fuelType?.message}
                        validation={{ required: "El tipo de combustible es obligatorio" }}
                    />
                </div>
            </div>

            <div className="flex flex-wrap justify-end gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="cursor-pointer rounded-lg border border-line px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-canvas focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                >
                    Cancelar
                </button>

                <button
                    type="submit"
                    disabled={isPending || isLoadingCrew}
                    className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-ink-deep px-4 py-2 text-sm font-semibold text-canvas shadow-sm transition-all duration-200 hover:bg-ink active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-ink-subtle disabled:shadow-none focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/30"
                >
                    {isPending ? <SpinnerComponent /> : trip.pilotName ? "Cambiar la tripulación" : "Tomar el viaje"}
                </button>
            </div>
        </CustomForm>
    );
}
