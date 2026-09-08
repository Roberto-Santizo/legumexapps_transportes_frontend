/**
 * La ficha del viaje, y el único sitio donde conviven las tres acciones que lo
 * mueven: tomarlo, arrancarlo y cerrarlo. Cada una la puede pulsar un solo rol
 * y ninguna la puede pulsar el administrador, que solo publica y corrige.
 *
 * Fuera de ámbito la API responde **403 y no 404**: el viaje existe, pero es de
 * otra empresa. Eso se dice tal cual, porque es información útil —el viaje se
 * lo llevó alguien— y no un error de la aplicación.
 */

import {
    TRIP_ALREADY_DELETED_MESSAGE,
    TripAssignmentModal,
    TripContainer,
    TripDeleteDialog,
    TripMoment,
    TripOrder,
    TripPageHeader,
    TripPilotDocuments,
    TripRouteMap,
    TripStatusBadge,
    TripTimeline,
    canAssignTrip,
    canAssignTrips,
    canFinishTrip,
    canRunTrips,
    canStartTrip,
    canTrackTrip,
    canTrackTrips,
    canWriteTrips,
    tripProvider
} from "@/features/trips/trips";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { CircleCheckBig, Pencil, Play, Radar, Trash2, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState, type ReactNode } from "react";
import type { RootState } from "@/config/store/store";

type FieldProps = {
    label: string;
    children: ReactNode;
}

function Field({ label, children }: FieldProps) {
    return (
        <div className="border-t border-line py-3.5">
            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                {label}
            </dt>
            <dd className="mt-1.5 text-sm text-ink">{children}</dd>
        </div>
    );
}

export function ShowTrip() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();

    const user = useSelector((state: RootState) => state.auth.user);
    const role = user?.role;

    const canWrite = canWriteTrips(role);
    const canAssign = canAssignTrips(role, user?.carrierId);
    const canRun = canRunTrips(role);
    const canTrack = canTrackTrips(role);

    const [isDeleting, setIsDeleting] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);

    const { data: trip, isLoading, isError, error } = useQuery({
        queryKey: ['getTripById', id],
        queryFn: () => tripProvider.getTripById(id!),
        enabled: Boolean(id)
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: ['getTrips'] });
        queryClient.invalidateQueries({ queryKey: ['getTripById', id] });
    };

    const { mutate: remove, isPending: isRemoving } = useMutation({
        mutationFn: () => tripProvider.deleteTripById(id!),
        onSuccess: (message) => {
            notification.success(message);
            queryClient.invalidateQueries({ queryKey: ['getTrips'] });
            setIsDeleting(false);
            /** La ficha ya no se puede volver a abrir: el detalle respondería 404. */
            navigate('/viajes');
        },
        onError: (err) => {
            notification.error(err.message);
            setIsDeleting(false);

            if (err.message.startsWith(TRIP_ALREADY_DELETED_MESSAGE)) {
                queryClient.invalidateQueries({ queryKey: ['getTrips'] });
                navigate('/viajes');
            }
        }
    });

    /** Sin cuerpo las dos: las fechas las pone el `now()` del servidor. */
    const { mutate: start, isPending: isStarting } = useMutation({
        mutationFn: () => tripProvider.startTripById(id!),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: finish, isPending: isFinishing } = useMutation({
        mutationFn: () => tripProvider.finishTripById(id!),
        onSuccess: (message) => {
            notification.success(message);
            invalidate();
        },
        onError: (err) => notification.error(err.message)
    });

    /**
     * El 403 de este endpoint no es un fallo: es el ámbito haciendo su trabajo.
     * Un viaje que tomó otra empresa deja de existir para ti, y el 404 tampoco
     * distingue entre un id inventado y uno borrado.
     */
    if (isError) {
        return (
            <ErrorComponent
                message={`${error.message}. Un viaje que tomó otra empresa, o que fue eliminado, deja de ser alcanzable: en los dos casos desaparece del listado y del detalle.`}
            />
        );
    }

    return (
        <div className="flex flex-col gap-8">
            <TripPageHeader
                title="Detalle del viaje"
                subtitle="Lo que se planificó, lo que va ocurriendo y quién lo lleva."
            >
                {trip && (
                    <div className="flex flex-wrap items-center gap-2">
                        {canTrack && canTrackTrip(trip) && (
                            <CustomFilledButton
                                label="Seguimiento en vivo"
                                type="button"
                                icon={<Radar size={16} />}
                                onClick={() => navigate(`/viajes/${trip.id}/seguimiento`)}
                            />
                        )}

                        {canAssign && canAssignTrip(trip) && (
                            <CustomFilledButton
                                label={trip.pilotId ? "Cambiar tripulación" : "Tomar el viaje"}
                                type="button"
                                icon={<Truck size={16} />}
                                onClick={() => setIsAssigning(true)}
                            />
                        )}

                        {canRun && canStartTrip(trip) && (
                            <CustomFilledButton
                                label="Iniciar viaje"
                                type="button"
                                icon={<Play size={16} />}
                                disabled={isStarting}
                                onClick={() => start()}
                            />
                        )}

                        {/* Sin `startDate` la API responde 400: no se cierra lo que no arrancó. */}
                        {canRun && canFinishTrip(trip) && (
                            <CustomFilledButton
                                label="Finalizar viaje"
                                type="button"
                                icon={<CircleCheckBig size={16} />}
                                disabled={isFinishing}
                                onClick={() => finish()}
                            />
                        )}

                        {canWrite && (
                            <>
                                <CustomFilledButton
                                    label="Editar"
                                    type="button"
                                    icon={<Pencil size={16} />}
                                    onClick={() => navigate(`/viajes/${trip.id}/editar`)}
                                />

                                <button
                                    type="button"
                                    onClick={() => setIsDeleting(true)}
                                    className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-line px-4 py-2 text-sm font-medium text-danger transition-colors hover:bg-surface focus:outline-none focus-visible:ring-2 focus-visible:ring-danger/20"
                                >
                                    <Trash2 size={16} />
                                    Eliminar
                                </button>
                            </>
                        )}
                    </div>
                )}
            </TripPageHeader>

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando viaje
                </p>
            )}

            {!isLoading && trip && (
                <FadeInUp>
                    <div className="flex flex-col gap-6">
                        {/* La orden y el contenedor mandan: son lo que se coteja contra el papel. */}
                        <div className="flex flex-col gap-4 rounded-2xl bg-ink-deep px-7 py-8 text-canvas">
                            <span className="font-mono text-[10px] uppercase tracking-[0.24em] text-canvas/50">
                                Viaje {trip.id}
                            </span>

                            <div className="flex flex-wrap items-end justify-between gap-4">
                                <div className="flex flex-col gap-3">
                                    <TripOrder order={trip.order} size="lg" />
                                    <TripContainer container={trip.container} inverted />
                                </div>

                                <TripStatusBadge status={trip.status} />
                            </div>

                            <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-canvas/80">
                                <span>{trip.departurePointName ?? "Punto de partida no disponible"}</span>
                                <span aria-hidden className="h-px w-6 bg-canvas/30" />
                                <span>{trip.locationName ?? "Puerto no disponible"}</span>
                                <span aria-hidden className="h-px w-6 border-t border-dashed border-canvas/30" />
                                <span>{trip.destination}</span>
                            </p>
                        </div>

                        <div className="grid gap-6 lg:grid-cols-2">
                            <TripTimeline trip={trip} />

                            <div className="flex flex-col gap-6">
                                <div className="rounded-2xl border border-line bg-surface p-6">
                                    <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                                        La carga
                                    </h2>

                                    <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
                                        <Field label="Cliente">
                                            {trip.clientName ?? <span className="text-ink-subtle">No disponible</span>}
                                        </Field>

                                        <Field label="Naviera">
                                            {trip.shippingLineName ?? <span className="text-ink-subtle">No disponible</span>}
                                        </Field>

                                        <Field label="Transporte">{trip.transport}</Field>

                                        <Field label="Destino final">{trip.destination}</Field>
                                    </dl>
                                </div>

                                <div className="rounded-2xl border border-line bg-surface p-6">
                                    <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                                        Quién lo lleva
                                    </h2>

                                    <dl className="mt-4 grid gap-x-8 sm:grid-cols-2">
                                        <Field label="Piloto">
                                            {trip.pilotName ?? <span className="text-ink-subtle">Sin asignar</span>}
                                        </Field>

                                        <Field label="Unidad">
                                            {trip.vehiclePlate
                                                ? <span className="font-mono text-[13px] uppercase tracking-[0.12em]">{trip.vehiclePlate}</span>
                                                : <span className="text-ink-subtle">Sin asignar</span>}
                                        </Field>

                                        <Field label="Lo tomó">
                                            {trip.assignedByName ?? <span className="text-ink-subtle">Nadie todavía</span>}
                                        </Field>

                                        <Field label="Lo publicó">
                                            {trip.registeredByName ?? <span className="text-ink-subtle">Sin registro</span>}
                                        </Field>
                                    </dl>

                                    {trip.pilotName && (
                                        <p className="mt-4 text-sm text-ink-muted">
                                            La tripulación no se puede quitar: el viaje no vuelve a estar
                                            disponible para otras empresas.
                                        </p>
                                    )}

                                    {/* Los papeles se leen junto a quien los lleva, no en una pantalla aparte: la API solo los expone aquí y en el listado de pilotos. */}
                                    <TripPilotDocuments trip={trip} />
                                </div>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-line bg-surface p-6">
                            <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                                Instrucciones
                            </h2>

                            <p className="mt-3 max-w-[70ch] text-sm whitespace-pre-line text-ink">
                                {trip.observations}
                            </p>
                        </div>

                        <div className="flex flex-col gap-3">
                            <div className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1">
                                <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                                    Ruta por carretera
                                </h2>

                                {/* En ruta el rastro real existe, y está a un clic: decirlo aquí evita leer este mapa como si fuera la posición del vehículo. */}
                                {canTrack && canTrackTrip(trip) ? (
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/viajes/${trip.id}/seguimiento`)}
                                        className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.18em] text-ink-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-ink/20"
                                    >
                                        Prevista · ver seguimiento en vivo
                                    </button>
                                ) : (
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                        Prevista · sin seguimiento en vivo
                                    </p>
                                )}
                            </div>

                            <TripRouteMap points={trip.points} />

                            <p className="text-xs text-ink-muted">
                                Es la ruta que se guardó al publicar el viaje, no la posición del
                                vehículo. Del puerto en adelante el trayecto es marítimo y no se
                                dibuja.
                            </p>
                        </div>

                        <dl className="grid max-w-3xl gap-x-8 sm:grid-cols-2">
                            <Field label="Publicado">
                                <TripMoment value={trip.createdAt} withTime />
                            </Field>

                            <Field label="Última actualización">
                                <TripMoment value={trip.updatedAt} withTime />
                            </Field>
                        </dl>
                    </div>
                </FadeInUp>
            )}

            <TripDeleteDialog
                trip={isDeleting ? trip ?? null : null}
                isPending={isRemoving}
                onClose={() => setIsDeleting(false)}
                onConfirm={() => remove()}
            />

            <TripAssignmentModal
                trip={isAssigning ? trip ?? null : null}
                onClose={() => setIsAssigning(false)}
            />
        </div>
    );
}
