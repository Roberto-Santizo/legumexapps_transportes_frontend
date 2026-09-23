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
    TripExpensesModal,
    TripFuelsModal,
    TripMoment,
    TripOrder,
    TripPageHeader,
    TripPilotDocuments,
    TripRouteMap,
    TripStatusBadge,
    TripTimeline,
    TripTimeoutsSection,
    canAssignTrip,
    canAssignTrips,
    canFinishTrip,
    canReadTripExpenses,
    canReadTripFuels,
    canReadTripTimeouts,
    canRegisterTripExpenses,
    canRegisterTripFuels,
    canRunTrips,
    canStartTrip,
    canTrackTrip,
    canTrackTrips,
    canWriteTrips,
    formatAmount,
    formatGallons,
    formatSignedHours,
    formatSignedKilometers,
    formatTripHours,
    formatTripKilometers,
    hasTraveledMetrics,
    hasTraveledRoute,
    hasTripEstimates,
    parseGallons,
    parseTripEstimate,
    tripDeviation,
    tripProvider
} from "@/features/trips/trips";
import { CustomFilledButton, ErrorComponent, FadeInUp, useNotification } from "@/features/shared/shared";
import { CircleCheckBig, Fuel, Pencil, Play, Radar, Trash2, Truck, Wallet } from "lucide-react";
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
    /** Leer las cargas lo pueden los siete roles; registrarlas, la empresa o el administrador. */
    const canReadFuels = canReadTripFuels(role);
    const canRegisterFuels = canRegisterTripFuels(role, user?.carrierId);
    /** Los viáticos siguen la misma regla que las cargas, salvo que `shipment` no los ve. */
    const canReadExpenses = canReadTripExpenses(role);
    const canRegisterExpenses = canRegisterTripExpenses(role, user?.carrierId);
    /** Las paradas las ven los mismos que el rastro: todos menos el piloto. */
    const canReadTimeouts = canReadTripTimeouts(role);

    const [isDeleting, setIsDeleting] = useState(false);
    const [isAssigning, setIsAssigning] = useState(false);
    const [isLoadingFuel, setIsLoadingFuel] = useState(false);
    const [isViewingExpenses, setIsViewingExpenses] = useState(false);

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

    /**
     * La ruta real se mira por la cadena y no por `traveledPoints`, que es `[]`
     * tanto en un viaje en ruta como en uno cerrado sin rastro. Las estimaciones
     * en `null` son un viaje anterior a la spec, y ninguna de las dos es un error.
     */
    const hasTraveled = Boolean(trip && hasTraveledRoute(trip));
    const hasEstimates = Boolean(trip && hasTripEstimates(trip));
    /** Solo en un viaje cerrado después de SPEC 32; `"0.00"` sí cuenta, es un cierre sin recorrido medible. */
    const hasMetrics = Boolean(trip && hasTraveledMetrics(trip));
    const kilometersDeviation = trip ? tripDeviation(trip.estimatedKilometers, trip.traveledKilometers) : null;
    const hoursDeviation = trip ? tripDeviation(trip.estimatedHours, trip.traveledHours) : null;

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

                        {canReadFuels && (
                            <CustomFilledButton
                                label="Combustible"
                                type="button"
                                icon={<Fuel size={16} />}
                                onClick={() => setIsLoadingFuel(true)}
                            />
                        )}

                        {canReadExpenses && (
                            <CustomFilledButton
                                label="Viáticos"
                                type="button"
                                icon={<Wallet size={16} />}
                                onClick={() => setIsViewingExpenses(true)}
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

                                        {/*
                                          * Solo suma lo que el piloto confirmó, así que un viaje
                                          * recién tomado marca 0.00 teniendo ya una carga. El
                                          * detalle no trae las cargas: el registro está en el
                                          * diálogo, y ahí el cero se explica solo.
                                          */}
                                        <Field label="Combustible confirmado">
                                            <span className="font-mono text-[13px] tabular-nums">
                                                {formatGallons(trip.totalFuelGallons ?? "0.00")} gal
                                            </span>
                                        </Field>

                                        {/* Misma regla que el combustible: solo lo que el piloto confirmó haber recibido.
                                          * A `shipment` la API le manda siempre "0.00": no ve dinero, así que no se pinta. */}
                                        {canReadExpenses && (
                                            <Field label="Viáticos confirmados">
                                                <span className="font-mono text-[13px] tabular-nums">
                                                    {formatAmount(trip.totalExpensesAmount ?? "0.00")}
                                                </span>
                                            </Field>
                                        )}
                                    </dl>

                                    {trip.pilotName && (
                                        <p className="mt-4 text-sm text-ink-muted">
                                            La tripulación no se puede quitar: el viaje no vuelve a estar
                                            disponible para otras empresas.
                                        </p>
                                    )}

                                    {/* El 400 de `/start` es lo que hace que este cero importe. */}
                                    {trip.pilotName && trip.startDate === null && parseGallons(trip.totalFuelGallons ?? "0.00") === 0 && (
                                        <p className="mt-2 text-sm text-ink-muted">
                                            El viaje no puede iniciar hasta que el piloto confirme al
                                            menos una carga de combustible.
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
                                ) : hasTraveled ? (
                                    /* La misma leyenda del seguimiento: son dos líneas y significan cosas distintas. */
                                    <span className="flex flex-wrap items-center gap-x-5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                        <span className="inline-flex items-center gap-2">
                                            <span aria-hidden className="h-px w-7 border-t-2 border-dashed border-ink/40" />
                                            Prevista
                                        </span>

                                        <span className="inline-flex items-center gap-2">
                                            <span aria-hidden className="h-[3px] w-7 rounded-full bg-primary" />
                                            Recorrida
                                        </span>
                                    </span>
                                ) : (
                                    <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                        Prevista · sin seguimiento en vivo
                                    </p>
                                )}
                            </div>

                            {/*
                              * Las dos cifras se guardaron con la ruta y valen lo que ella:
                              * si un PATCH cambió el destino sin remandarla, mienten a la vez.
                              * Sin ellas es un viaje anterior a la spec, no un fallo.
                              *
                              * Al cerrar aparecen las dos reales y la comparación es una
                              * resta del front: la API no calcula desvío ni retraso. Son
                              * cifras brutas —la distancia suma el ruido GPS de las paradas
                              * y las horas no descuentan los tiempos muertos—, y se dice.
                              */}
                            {hasMetrics ? (
                                <div className="flex flex-col gap-3">
                                    <dl className="grid gap-x-10 gap-y-4 sm:grid-cols-2">
                                        <div className="flex flex-col gap-2">
                                            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                                Estimado
                                            </dt>

                                            <dd className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                                {hasEstimates ? (
                                                    <>
                                                        <span className="font-mono text-2xl leading-none text-ink-muted">
                                                            {formatTripKilometers(trip.estimatedKilometers)}
                                                        </span>

                                                        <span className="font-mono text-2xl leading-none text-ink-muted">
                                                            ~{formatTripHours(trip.estimatedHours)}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs text-ink-muted">
                                                        Sin estimación: el viaje se publicó antes de que se registrara.
                                                    </span>
                                                )}
                                            </dd>
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <dt className="font-mono text-[10px] uppercase tracking-[0.18em] text-ink-subtle">
                                                Real
                                            </dt>

                                            <dd className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                                                <span className="font-mono text-2xl leading-none text-ink">
                                                    {formatTripKilometers(trip.traveledKilometers)}
                                                </span>

                                                <span className="font-mono text-2xl leading-none text-ink">
                                                    {formatTripHours(trip.traveledHours)}
                                                </span>
                                            </dd>

                                            {/* La resta solo tiene sentido con las dos cifras; sin estimación no hay contra qué desviarse. */}
                                            {kilometersDeviation !== null && hoursDeviation !== null && (
                                                <p className="font-mono text-xs tabular-nums text-ink-muted">
                                                    <span className={kilometersDeviation > 0 ? 'text-danger' : 'text-success'}>
                                                        {formatSignedKilometers(kilometersDeviation)}
                                                    </span>
                                                    {' · '}
                                                    <span className={hoursDeviation > 0 ? 'text-danger' : 'text-success'}>
                                                        {formatSignedHours(hoursDeviation)}
                                                    </span>
                                                    {' '}
                                                    <span className="font-sans text-ink-subtle">respecto a lo estimado</span>
                                                </p>
                                            )}
                                        </div>
                                    </dl>

                                    <p className="text-xs text-ink-muted">
                                        {parseTripEstimate(trip.traveledKilometers) === 0
                                            ? "El cierre no dejó recorrido medible: el piloto reportó una posición o ninguna. Las horas van de la salida al cierre."
                                            : "Cifras brutas del cierre. La distancia suma todo el rastro reportado, incluido el ruido del GPS con el camión parado, y las horas van de la salida al cierre sin descontar los tiempos muertos."}
                                    </p>
                                </div>
                            ) : hasEstimates ? (
                                <p className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                                    <span className="font-mono text-2xl leading-none text-ink">
                                        {formatTripKilometers(trip.estimatedKilometers)}
                                    </span>

                                    <span className="font-mono text-2xl leading-none text-ink-muted">
                                        ~{formatTripHours(trip.estimatedHours)}
                                    </span>

                                    <span className="text-xs text-ink-muted">
                                        estimados por carretera, sin tráfico. No es una hora de llegada.
                                    </span>
                                </p>
                            ) : (
                                <p className="text-xs text-ink-muted">
                                    Sin distancia ni duración estimadas: el viaje se publicó antes de
                                    que se registraran. Se calculan al editarlo.
                                </p>
                            )}

                            <TripRouteMap
                                points={trip.points}
                                traveledPoints={hasTraveled ? trip.traveledPoints : undefined}
                            />

                            <p className="text-xs text-ink-muted">
                                {hasTraveled
                                    ? "En ámbar, el recorrido que quedó registrado al cerrar el viaje; en guion, la ruta que se planificó. Del puerto en adelante el trayecto es marítimo y no se dibuja."
                                    : trip.status === 'finished'
                                        ? "Es la ruta que se guardó al publicar el viaje. El cierre no dejó ningún recorrido registrado: el piloto no reportó posiciones, o el viaje se cerró antes de que se guardaran."
                                        : "Es la ruta que se guardó al publicar el viaje, no la posición del vehículo. Del puerto en adelante el trayecto es marítimo y no se dibuja."}
                            </p>
                        </div>

                        {/*
                          * Solo desde que el viaje arranca: antes no hay una sola
                          * posición reportada, así que la sección no diría nada.
                          */}
                        {canReadTimeouts && trip.startDate !== null && (
                            <TripTimeoutsSection trip={trip} />
                        )}

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

            <TripFuelsModal
                trip={isLoadingFuel ? trip ?? null : null}
                canRegister={canRegisterFuels}
                onClose={() => setIsLoadingFuel(false)}
            />

            <TripExpensesModal
                trip={isViewingExpenses ? trip ?? null : null}
                canRegister={canRegisterExpenses}
                onClose={() => setIsViewingExpenses(false)}
            />
        </div>
    );
}
