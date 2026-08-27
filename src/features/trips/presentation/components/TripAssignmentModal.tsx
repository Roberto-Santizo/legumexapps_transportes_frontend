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
 */

import type { Trip, TripAssignmentForm } from "@/features/trips/trips";
import {
    TRIP_CREW_LIMIT,
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
import { CustomForm, Modal, SpinnerComponent, useNotification } from "@/features/shared/shared";
import { pilotProvider } from "@/features/pilots/pilots";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { IdCard } from "lucide-react";

type Props = {
    /** El viaje que se va a tomar, o `null` con el diálogo cerrado. */
    trip: Trip | null;
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
    trip: Trip;
    onClose: () => void;
}

function TripAssignmentForm({ trip, onClose }: FormProps) {
    const notification = useNotification();
    const queryClient = useQueryClient();

    const {
        control,
        handleSubmit,
        setError,
        formState: { errors },
    } = useForm<TripAssignmentForm>({
        /** Reasignar parte de la tripulación actual; tomarlo por primera vez, de nada. */
        defaultValues: {
            pilotId: trip.pilotId ?? undefined,
            vehicleId: trip.vehicleId ?? undefined,
        }
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
        mutationFn: (payload: TripAssignmentForm) =>
            tripProvider.assignTripById(trip.id.toString(), payload),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getTrips'] });
            queryClient.invalidateQueries({ queryKey: ['getTripById', trip.id.toString()] });
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

    const onSubmit = (data: TripAssignmentForm) => mutate(buildTripAssignmentPayload(data));

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

            <CardSelectFormField<TripAssignmentForm>
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

            <VehicleCardSelectFormField<TripAssignmentForm>
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
                    {isPending ? <SpinnerComponent /> : trip.pilotId ? "Cambiar la tripulación" : "Tomar el viaje"}
                </button>
            </div>
        </CustomForm>
    );
}
