/**
 * El listado, que es **cuatro pantallas distintas** servidas por el mismo
 * endpoint. Lo que cambia no es el filtro: es el ámbito, y lo aplica el
 * servidor según el rol.
 *
 * - **Administrador y manager** ven todos los viajes. El administrador además
 *   los publica, los edita y los da de baja —pero **no puede asignar**: no hay
 *   ninguna ruta que se lo permita—.
 * - **Transportista** ve dos cosas mezcladas en la misma respuesta: la bolsa
 *   —lo que nadie ha tomado— y lo que tomó su empresa. La API no trae ninguna
 *   marca para separarlas, así que se separan aquí por `assignedById`, y se
 *   pintan como dos listas porque son dos trabajos distintos: una se elige, la
 *   otra se ejecuta.
 * - **Piloto** ve una agenda, no un catálogo: solo los viajes que tiene
 *   asignados. No se le ofrece buscar viajes disponibles porque no puede
 *   tomarlos y la bolsa ni siquiera le aparece.
 */

import {
    TRIP_ALREADY_DELETED_MESSAGE,
    TripAssignmentModal,
    TripDeleteDialog,
    TripFiltersBar,
    TripFuelsModal,
    TripMoment,
    TripOrder,
    TripRouteLine,
    TripStatusBadge,
    canAssignTrip,
    canAssignTrips,
    canFinishTrip,
    canReadTripFuels,
    canRegisterTripFuels,
    canRunTrips,
    canStartTrip,
    canTrackTrip,
    canTrackTrips,
    canWriteTrips,
    isTripInBag,
    tripProvider,
    type TripListItem
} from "@/features/trips/trips";
import { ActionsMenu, CustomFilledButton, ErrorComponent, FadeInUp, Pagination, Table, Tbody, Td, Th, Thead, Title, Tr, useNotification, usePagination } from "@/features/shared/shared";
import { CircleCheckBig, Eye, Fuel, Pencil, Play, Plus, Radar, Trash2, Truck } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { useState } from "react";
import type { RootState } from "@/config/store/store";

/** El texto de cabecera cambia con lo que el rol puede hacer, no solo con lo que ve. */
const SUBTITLES: Record<string, string> = {
    administrator: "Los viajes de exportación publicados. Se publican sin dueño: la empresa transportista que los toma es la que se los queda.",
    manager: "Todos los viajes de exportación, publicados y tomados.",
    carrier: "Los viajes disponibles y los que ya tomó tu empresa.",
    pilot: "Tu agenda: los viajes que tienes asignados.",
};

export function IndexTrips() {
    const navigate = useNavigate();
    const notification = useNotification();
    const queryClient = useQueryClient();
    const [searchParams, setSearchParams] = useSearchParams();
    const { page, rowsPerPage } = usePagination(searchParams);

    const user = useSelector((state: RootState) => state.auth.user);
    const role = user?.role;

    const canWrite = canWriteTrips(role);
    const canAssign = canAssignTrips(role, user?.carrierId);
    const canRun = canRunTrips(role);
    const canTrack = canTrackTrips(role);
    /** Leer las cargas lo pueden los cuatro roles; registrarlas, solo la empresa. */
    const canReadFuels = canReadTripFuels(role);
    const canRegisterFuels = canRegisterTripFuels(role, user?.carrierId);

    const search = searchParams.get('search') ?? '';
    const status = searchParams.get('status') ?? '';
    const dateFrom = searchParams.get('dateFrom') ?? '';
    const dateTo = searchParams.get('dateTo') ?? '';

    /** El viaje pendiente de confirmar el borrado, o `null` sin diálogo abierto. */
    const [tripToDelete, setTripToDelete] = useState<TripListItem | null>(null);
    /** El viaje que se está tomando, o `null` con el diálogo cerrado. */
    const [tripToAssign, setTripToAssign] = useState<TripListItem | null>(null);
    /** El viaje cuyas cargas de combustible se están mirando. */
    const [tripToFuel, setTripToFuel] = useState<TripListItem | null>(null);

    const { data, isLoading, isError, error } = useQuery({
        queryKey: ['getTrips', page, rowsPerPage, search, status, dateFrom, dateTo],
        queryFn: () => tripProvider.getTrips(rowsPerPage.toString(), page.toString(), {
            search,
            status,
            dateFrom,
            dateTo
        })
    });

    const invalidateTrips = () => queryClient.invalidateQueries({ queryKey: ['getTrips'] });

    const { mutate: remove, isPending: isRemoving } = useMutation({
        mutationFn: (id: string) => tripProvider.deleteTripById(id),
        onSuccess: (message) => {
            notification.success(message);
            invalidateTrips();
            setTripToDelete(null);
        },
        /**
         * El 400 «El viaje ya fue eliminado» solo pasa con una tabla obsoleta
         * —alguien lo borró antes—, así que se recarga para que la fila fantasma
         * desaparezca. Un 404 es otra cosa: el id nunca existió.
         */
        onError: (err) => {
            notification.error(err.message);

            if (err.message.startsWith(TRIP_ALREADY_DELETED_MESSAGE)) invalidateTrips();

            setTripToDelete(null);
        }
    });

    /**
     * Arrancar y cerrar no llevan cuerpo: las dos fechas las pone el `now()` del
     * servidor. El listado se recarga porque las dos mueven también el `status`.
     */
    const { mutate: start } = useMutation({
        mutationFn: (id: string) => tripProvider.startTripById(id),
        onSuccess: (message) => {
            notification.success(message);
            invalidateTrips();
        },
        onError: (err) => notification.error(err.message)
    });

    const { mutate: finish } = useMutation({
        mutationFn: (id: string) => tripProvider.finishTripById(id),
        onSuccess: (message) => {
            notification.success(message);
            invalidateTrips();
        },
        onError: (err) => notification.error(err.message)
    });

    if (isError) return <ErrorComponent message={error.message} />

    const trips = data?.data ?? [];
    const isFiltered = Boolean(search || status || dateFrom || dateTo);

    /** Solo el transportista ve las dos listas: para los demás la partición no aplica. */
    const bag = canAssign ? trips.filter(isTripInBag) : [];
    const assigned = canAssign ? trips.filter((trip) => !isTripInBag(trip)) : trips;

    const buildActions = (trip: TripListItem) => [
        {
            label: "Ver detalle",
            icon: <Eye />,
            onClick: () => navigate(`/viajes/${trip.id}`)
        },
        ...(canTrack && canTrackTrip(trip) ? [{
            label: "Seguimiento en vivo",
            icon: <Radar />,
            onClick: () => navigate(`/viajes/${trip.id}/seguimiento`)
        }] : []),
        ...(canAssign && canAssignTrip(trip) ? [{
            label: isTripInBag(trip) ? "Tomar el viaje" : "Cambiar tripulación",
            icon: <Truck />,
            onClick: () => setTripToAssign(trip)
        }] : []),
        ...(canReadFuels ? [{
            label: "Combustible",
            icon: <Fuel />,
            onClick: () => setTripToFuel(trip)
        }] : []),
        ...(canRun && canStartTrip(trip) ? [{
            label: "Iniciar viaje",
            icon: <Play />,
            onClick: () => start(trip.id.toString())
        }] : []),
        ...(canRun && canFinishTrip(trip) ? [{
            label: "Finalizar viaje",
            icon: <CircleCheckBig />,
            onClick: () => finish(trip.id.toString())
        }] : []),
        ...(canWrite ? [
            {
                label: "Editar",
                icon: <Pencil />,
                onClick: () => navigate(`/viajes/${trip.id}/editar`)
            },
            {
                label: "Eliminar",
                icon: <Trash2 />,
                onClick: () => setTripToDelete(trip),
                danger: true
            }
        ] : [])
    ];

    const renderTable = (rows: TripListItem[]) => (
        <Table>
            <Thead>
                <Th text="Orden" />
                <Th text="Trayecto" />
                <Th text="Recolección" />
                <Th text="Estado" />
                <Th text="Tripulación" />
                <Th text="" />
            </Thead>

            <Tbody>
                {/* La clave es el `id`: la orden y el contenedor no son únicos. */}
                {rows.map((trip) => (
                    <Tr key={trip.id}>
                        <Td>
                            <div className="flex flex-col gap-1">
                                <TripOrder order={trip.order} />

                                <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                                    {trip.container}
                                </span>
                            </div>
                        </Td>

                        <Td>
                            <div className="flex flex-col gap-1">
                                {/* Sin el destino final: el listado no lo trae, solo el detalle. */}
                                <TripRouteLine
                                    departurePointName={trip.departurePointName}
                                    locationName={trip.locationName}
                                />

                                <span className="text-xs text-ink-subtle">
                                    {trip.shippingLineName ?? "Naviera no disponible"}
                                </span>
                            </div>
                        </Td>

                        <Td>
                            <TripMoment value={trip.recolectionDate} />
                        </Td>

                        <Td>
                            <TripStatusBadge status={trip.status} />
                        </Td>

                        <Td>
                            {trip.pilotName ? (
                                <div className="flex flex-col gap-1">
                                    <span className="text-sm text-ink">{trip.pilotName}</span>

                                    {trip.vehiclePlate && (
                                        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-ink-subtle">
                                            {trip.vehiclePlate}
                                        </span>
                                    )}
                                </div>
                            ) : (
                                <span className="text-sm text-ink-subtle">Sin asignar</span>
                            )}
                        </Td>

                        <Td className="text-right">
                            <ActionsMenu items={buildActions(trip)} />
                        </Td>
                    </Tr>
                ))}
            </Tbody>
        </Table>
    );

    return (
        <div className="flex flex-col gap-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
                <Title
                    title="Viajes"
                    subtitle={SUBTITLES[role ?? ''] ?? "Los viajes de exportación."}
                />

                {canWrite && (
                    <CustomFilledButton
                        label="Publicar viaje"
                        type="button"
                        icon={<Plus size={16} />}
                        onClick={() => navigate('/viajes/crear')}
                    />
                )}
            </div>

            <TripFiltersBar
                search={search}
                status={status}
                dateFrom={dateFrom}
                dateTo={dateTo}
                setSearchParams={setSearchParams}
            />

            {isLoading && (
                <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                    Cargando viajes
                </p>
            )}

            {!isLoading && trips.length === 0 && (
                <FadeInUp>
                    <div className="rounded-2xl border border-dashed border-line-strong bg-surface px-8 py-14 text-center">
                        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ink-subtle">
                            Sin registros
                        </p>

                        <p className="mx-auto mt-3 max-w-[34ch] font-display text-xl font-semibold tracking-tight text-ink">
                            {isFiltered
                                ? "Ningún viaje coincide con los filtros."
                                : canRun
                                    ? "No tienes viajes asignados."
                                    : "Todavía no hay viajes publicados."}
                        </p>

                        <p className="mx-auto mt-2 max-w-[48ch] text-sm text-ink-muted">
                            {isFiltered
                                ? "Prueba con otra parte de la orden o del contenedor, o amplía el rango de fechas."
                                : canRun
                                    ? "Cuando tu empresa te asigne uno, aparecerá aquí y podrás iniciarlo."
                                    : canAssign
                                        ? "Cuando el administrador publique un viaje, aparecerá aquí para que tu empresa lo tome."
                                        : "Publica el primer viaje con su orden, su contenedor y la ruta hasta el puerto."}
                        </p>

                        {canWrite && !isFiltered && (
                            <div className="mt-6 flex justify-center">
                                <CustomFilledButton
                                    label="Publicar viaje"
                                    type="button"
                                    icon={<Plus size={16} />}
                                    onClick={() => navigate('/viajes/crear')}
                                />
                            </div>
                        )}
                    </div>
                </FadeInUp>
            )}

            {!isLoading && trips.length > 0 && (
                <FadeInUp>
                    {canAssign ? (
                        <div className="flex flex-col gap-10">
                            <section className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                                        Disponibles
                                    </h2>

                                    <p className="text-sm text-ink-muted">
                                        Viajes que todavía no ha tomado nadie. En cuanto los tomes
                                        dejan de aparecer para las demás empresas.
                                    </p>
                                </div>

                                {bag.length > 0 ? renderTable(bag) : (
                                    <p className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-8 text-center text-sm text-ink-muted">
                                        No hay viajes disponibles en esta página.
                                    </p>
                                )}
                            </section>

                            <section className="flex flex-col gap-4">
                                <div className="flex flex-col gap-1">
                                    <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                                        De tu empresa
                                    </h2>

                                    <p className="text-sm text-ink-muted">
                                        Los que ya tomó tu empresa, los tomara quien los tomara.
                                        Mientras sigan pendientes puedes cambiarles la tripulación.
                                    </p>
                                </div>

                                {assigned.length > 0 ? renderTable(assigned) : (
                                    <p className="rounded-xl border border-dashed border-line-strong bg-surface px-6 py-8 text-center text-sm text-ink-muted">
                                        Tu empresa no ha tomado ningún viaje en esta página.
                                    </p>
                                )}
                            </section>
                        </div>
                    ) : renderTable(assigned)}

                    <Pagination
                        page={page}
                        rowsPerPage={rowsPerPage}
                        count={data?.total ?? trips.length}
                        setSearchParams={setSearchParams}
                    />
                </FadeInUp>
            )}

            <TripDeleteDialog
                trip={tripToDelete}
                isPending={isRemoving}
                onClose={() => setTripToDelete(null)}
                onConfirm={() => tripToDelete && remove(tripToDelete.id.toString())}
            />

            <TripAssignmentModal
                trip={tripToAssign}
                onClose={() => setTripToAssign(null)}
            />

            <TripFuelsModal
                trip={tripToFuel}
                canRegister={canRegisterFuels}
                onClose={() => setTripToFuel(null)}
            />
        </div>
    );
}
